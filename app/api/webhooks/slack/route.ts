import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"
import { sendDecisionNotification } from "@/lib/notifications"
import crypto from "crypto"

// Verify Slack request signature
function verifySlackRequest(
  body: string,
  signature: string,
  timestamp: string,
  signingSecret: string
): boolean {
  const baseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac("sha256", signingSecret)
  hmac.update(baseString)
  const mySignature = `v0=${hmac.digest("hex")}`
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(mySignature)
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
    const body = await request.text()
    const timestamp = request.headers.get("x-slack-request-timestamp") || ""
    const signature = request.headers.get("x-slack-signature") || ""
    const signingSecret = process.env.SLACK_SIGNING_SECRET

    // Verify request is from Slack
    if (signingSecret) {
      const isValid = verifySlackRequest(body, signature, timestamp, signingSecret)
      if (!isValid) {
        console.error("[SlackWebhook] Invalid signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
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

      // Only process message events
      if (event.type !== "message") {
        return NextResponse.json({ message: "Event type not handled" }, { status: 200 })
      }

      // Skip bot messages and edits
      if (event.subtype === "bot_message" || event.subtype === "message_changed" || event.subtype === "message_deleted") {
        return NextResponse.json({ message: "Skipping bot/edited message" }, { status: 200 })
      }

      console.log("[SlackWebhook] New message event:", {
        channel: event.channel,
        user: event.user,
        text: event.text?.substring(0, 100),
      })

      // Find the user who has this Slack workspace connected
      const slackIntegration = await prisma.slackIntegration.findFirst({
        where: {
          // We need to find by team_id or similar - let's get more context
          teamId: payload.team_id,
        },
      })

      if (!slackIntegration) {
        console.log("[SlackWebhook] No integration found for team:", payload.team_id)
        return NextResponse.json({ message: "Integration not found" }, { status: 200 })
      }

      const userId = slackIntegration.userId

      // Check if this channel was recently analyzed (avoid spam)
      const recentDecision = await prisma.decision.findFirst({
        where: {
          userId,
          source: "slack",
          sourceLink: { contains: event.channel },
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // 30 min cooldown
        },
      })

      if (recentDecision) {
        console.log("[SlackWebhook] Channel recently analyzed, skipping")
        return NextResponse.json({ message: "Recently analyzed" }, { status: 200 })
      }

      // Get recent messages from the channel to form a conversation context
      const response = await fetch(
        `https://slack.com/api/conversations.history?channel=${event.channel}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${slackIntegration.accessToken}`,
          },
        }
      )

      const data = await response.json()
      if (!data.ok) {
        console.error("[SlackWebhook] Failed to fetch messages:", data.error)
        return NextResponse.json({ message: "Failed to fetch messages" }, { status: 200 })
      }

      const messages = data.messages || []
      
      // Filter and format messages for analysis
      const conversation = messages
        .filter((msg: any) => msg.type === "message" && msg.text)
        .map((msg: any) => `${msg.user}: ${msg.text}`)
        .join("\n\n")

      if (!conversation.trim()) {
        return NextResponse.json({ message: "No messages to analyze" }, { status: 200 })
      }

      // Log the webhook event
      const webhookLog = await prisma.webhookLog.create({
        data: {
          userId,
          source: "slack",
          eventType: event.type,
          payload: JSON.stringify({ channel: event.channel, messageCount: messages.length }),
          status: "pending",
        },
      })

      // Analyze for decisions
      console.log("[SlackWebhook] Analyzing conversation for decisions...")
      const detection = await detectDecision(conversation)

      if (detection.isDecision && detection.confidence >= 0.6) {
        const brief = await generateDecisionBrief(conversation, `Slack Channel: ${event.channel}`)

        // Save the decision
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

        // Update webhook log
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

        // Send notification
        await sendDecisionNotification({
          userId,
          type: "decision_detected",
          title: decision.title,
          message: `A new decision was detected from Slack with ${Math.round(detection.confidence * 100)}% confidence.`,
          decisionId: decision.id,
          source: "slack",
        })

        console.log("[SlackWebhook] ✅ Decision detected and saved:", decision.title)
        return NextResponse.json({ 
          success: true, 
          decisionId: decision.id,
          message: "Decision detected and saved"
        })
      }

      // Update webhook log for no decision
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: "processed",
          processedAt: new Date(),
        },
      })

      return NextResponse.json({ message: "No decision detected" }, { status: 200 })
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

// Handle GET requests for verification
export async function GET() {
  return NextResponse.json({ 
    message: "Slack webhook endpoint is active",
    instructions: "Configure this URL in Slack's Event Subscriptions"
  })
}
