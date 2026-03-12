import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"
import { sendDecisionNotification } from "@/lib/notifications"
import { decryptToken } from "@/lib/crypto"
import { webhookRateLimit } from "@/lib/rate-limit"
import { createAuditLog } from "@/lib/audit"
import crypto from "crypto"

// ─── Signature verification ────────────────────────────────────────────────────

/**
 * Verify Slack request signature using timing-safe comparison.
 * Also validates the request timestamp to reject replays older than 5 minutes.
 */
function verifySlackRequest(
  body: string,
  signature: string,
  timestamp: string,
  signingSecret: string
): boolean {
  // Reject requests with stale timestamps (replay-attack protection)
  const requestTime = parseInt(timestamp, 10)
  if (isNaN(requestTime) || Math.abs(Date.now() / 1_000 - requestTime) > 300) {
    return false
  }

  const baseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac("sha256", signingSecret)
  hmac.update(baseString)
  const mySignature = `v0=${hmac.digest("hex")}`

  // Both buffers must be the same length for timingSafeEqual
  const sigBuf = Buffer.alloc(mySignature.length, 0)
  Buffer.from(signature).copy(sigBuf, 0, 0, Math.min(signature.length, mySignature.length))

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    sigBuf
  )
}

interface SlackEvent {
  type: string
  channel: string
  user?: string
  text?: string
  ts?: string
  channel_type?: string
  message?: {
    type: string
    channel: string
    user?: string
    text?: string
    ts?: string
    subtype?: string
  }
}

export async function POST(request: Request) {
  try {
    // ── Rate limit by IP ──────────────────────────────────────────────────────
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
    const rl = webhookRateLimit(ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      )
    }

    const body = await request.text()
    const timestamp = request.headers.get("x-slack-request-timestamp") || ""
    const signature = request.headers.get("x-slack-signature") || ""
    const signingSecret = process.env.SLACK_SIGNING_SECRET

    // ── Signature verification (required) ────────────────────────────────────
    if (!signingSecret) {
      console.error("[SlackWebhook] SLACK_SIGNING_SECRET is not set — rejecting all requests")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }

    const isValid = verifySlackRequest(body, signature, timestamp, signingSecret)
    if (!isValid) {
      console.error("[SlackWebhook] Invalid signature or stale timestamp")
      // Log signature failure — no user attribution possible at this point; use a sentinel value
      // so the record is queryable by ops teams from the admin panel.
      const slackSignatureAuditUserId = process.env.SYSTEM_AUDIT_USER_ID ?? null
      if (slackSignatureAuditUserId) {
        createAuditLog(
          slackSignatureAuditUserId,
          "WEBHOOK_SIGNATURE_FAILED",
          { source: "slack", ip, reason: "invalid_signature" },
          request
        ).catch(() => null)
      }
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the payload
    const payload = JSON.parse(body)

    // Handle URL verification challenge (required for Slack Events API)
    if (payload.type === "url_verification") {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // Handle event callbacks
    if (payload.type === "event_callback") {
      const event: SlackEvent = payload.event

      // ── Idempotency check ───────────────────────────────────────────────────
      const slackEventId: string | undefined = payload.event_id
      if (slackEventId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).webhookEvent.create({
            data: { source: "slack", eventId: slackEventId },
          })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          // Unique constraint violation — already processed
          if (err?.code === "P2002") {
            return NextResponse.json({ message: "Duplicate event" }, { status: 200 })
          }
          throw err
        }
      }

      // Only process message events
      if (event.type !== "message") {
        return NextResponse.json({ message: "Event type not handled" }, { status: 200 })
      }

      // Skip bot messages and edits
      const subtype = (event as any).subtype || event.message?.subtype
      if (subtype === "bot_message" || subtype === "message_changed" || subtype === "message_deleted") {
        return NextResponse.json({ message: "Skipping bot/edited message" }, { status: 200 })
      }

      // ── Multi-tenant fan-out ────────────────────────────────────────────────
      // Resolve ALL users in this workspace — not just the first match — so
      // every connected user receives their own decision analysis.
      const slackIntegrations = await prisma.slackIntegration.findMany({
        where: { teamId: payload.team_id },
      })

      if (slackIntegrations.length === 0) {
        console.log("[SlackWebhook] No integration found for team:", payload.team_id)
        return NextResponse.json({ message: "Integration not found" }, { status: 200 })
      }

      // Process for each connected user in parallel
      await Promise.allSettled(
        slackIntegrations.map(async (slackIntegration) => {
          // Skip channels not in the allowlist (when the list is non-empty)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allowed = (slackIntegration as any).allowedChannels as string[] | undefined
          if (allowed && allowed.length > 0 && !allowed.includes(event.channel)) {
            return
          }

          const userId = slackIntegration.userId

          // 30-minute per-channel cooldown per user
          const recentDecision = await prisma.decision.findFirst({
            where: {
              userId,
              source: "slack",
              sourceLink: { contains: event.channel },
              createdAt: { gte: new Date(Date.now() - 30 * 60 * 1_000) },
            },
          })
          if (recentDecision) return

          // Decrypt token before use — stored encrypted at rest
          const accessToken = decryptToken(slackIntegration.accessToken)
          if (!accessToken) return

          // Fetch recent messages from the channel
          const slackResp = await fetch(
            `https://slack.com/api/conversations.history?channel=${event.channel}&limit=20`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          const slackData = await slackResp.json()
          if (!slackData.ok) {
            console.error("[SlackWebhook] Failed to fetch messages:", slackData.error)
            return
          }

          const messages: any[] = slackData.messages || []
          const conversation = messages
            .filter((msg: any) => msg.type === "message" && msg.text)
            // Strip display names — keep only user IDs to avoid storing PII in the log
            .map((msg: any) => `${msg.user ?? "unknown"}: ${msg.text}`)
            .join("\n\n")

          if (!conversation.trim()) return

          // PII-stripped payload for the audit log (channel + count only, no message content)
          const safePayload = JSON.stringify({
            channel: event.channel,
            messageCount: messages.length,
            teamId: payload.team_id,
          })

          const webhookLog = await prisma.webhookLog.create({
            data: {
              userId,
              source: "slack",
              eventType: event.type,
              payload: safePayload,
              status: "pending",
            },
          })

          const detection = await detectDecision(conversation)

          if (detection.isDecision && detection.confidence >= 0.6) {
            const brief = await generateDecisionBrief(conversation, `Slack Channel: ${event.channel}`)

            const decision = await prisma.decision.create({
              data: {
                userId,
                title: brief.title,
                summary: brief.summary,
                problemStatement: brief.problemStatement,
                optionsDiscussed: brief.optionsDiscussed,
                finalDecision: brief.finalDecision,
                rationale: brief.rationale,
                actionItems: brief.actionItems,
                confidence: detection.confidence,
                source: "slack",
                sourceLink: `https://slack.com/app_redirect?channel=${event.channel}`,
              },
            })

            await prisma.webhookLog.update({
              where: { id: webhookLog.id },
              data: {
                status: "processed",
                decisionId: decision.id,
                decisionTitle: decision.title,
                confidence: detection.confidence,
                processedAt: new Date(),
              },
            })

            await sendDecisionNotification({
              userId,
              type: "decision_detected",
              title: decision.title,
              message: `A new decision was detected from Slack with ${Math.round(detection.confidence * 100)}% confidence.`,
              decisionId: decision.id,
              source: "slack",
            })

            console.log("[SlackWebhook] ✅ Decision saved:", decision.title, "for user:", userId)
          } else {
            await prisma.webhookLog.update({
              where: { id: webhookLog.id },
              data: { status: "processed", processedAt: new Date() },
            })
          }
        })
      )

      return NextResponse.json({ message: "Processed" }, { status: 200 })
    }

    return NextResponse.json({ message: "Unknown payload type" }, { status: 200 })
  } catch (error) {
    console.error("[SlackWebhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Slack webhook endpoint is active",
    instructions: "Configure this URL in Slack's Event Subscriptions",
  })
}
