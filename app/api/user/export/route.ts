/**
 * GET /api/user/export
 *
 * GDPR Art. 20 — Right to Data Portability.
 * Returns a JSON file containing all data owned by the authenticated user:
 *   - Profile information
 *   - Decisions (including meeting associations)
 *   - Meetings
 *   - Integration metadata (no tokens — never exported for security reasons)
 *   - Audit log entries
 *
 * The response is streamed as a downloadable `user-data-export.json` attachment.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all user-owned data in parallel.
    const [user, decisions, meetings, slackIntegration, gitlabIntegration, auditLogs] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        }),
        prisma.decision.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            summary: true,
            problemStatement: true,
            optionsDiscussed: true,
            finalDecision: true,
            rationale: true,
            actionItems: true,
            source: true,
            sourceLink: true,
            confidence: true,
            userRating: true,
            feedbackNote: true,
            createdAt: true,
            updatedAt: true,
            meeting: {
              select: { id: true, title: true, startTime: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.meeting.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
            meetLink: true,
            // Exclude transcript to keep export size manageable; user can request separately
          },
          orderBy: { startTime: "desc" },
        }),
        prisma.slackIntegration
          .findUnique({
            where: { userId },
            select: {
              teamName: true,
              userSlackId: true,
              connectedAt: true,
              // accessToken intentionally excluded
            },
          })
          .catch(() => null),
        prisma.gitLabIntegration
          .findUnique({
            where: { userId },
            select: {
              username: true,
              gitlabUrl: true,
              connectedAt: true,
              // accessToken intentionally excluded
            },
          })
          .catch(() => null),
        (prisma as any).auditLog.findMany({
          where: { userId },
          select: {
            action: true,
            metadata: true,
            ipAddress: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ])

    // Record the export action in the audit log.
    createAuditLog(userId, "DECISION_EXPORTED", { count: decisions.length }, request).catch(
      () => null
    )

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      notice:
        "This file contains all personal data held about you by KnowWhy. " +
        "Integration access tokens are never included in data exports for security reasons.",
      profile: user,
      decisions,
      meetings,
      integrations: {
        slack: slackIntegration ?? null,
        gitlab: gitlabIntegration ?? null,
      },
      auditLog: auditLogs,
    }

    const jsonBody = JSON.stringify(exportPayload, null, 2)

    return new Response(jsonBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="knowwhy-data-export.json"',
        "Content-Length": Buffer.byteLength(jsonBody).toString(),
        // Prevent browsers from caching the export.
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[GET /api/user/export] Error:", error)
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 })
  }
}
