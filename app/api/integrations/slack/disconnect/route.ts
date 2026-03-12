import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { decryptToken } from "@/lib/crypto"
import { createAuditLog } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: session.user.id },
    })

    if (integration) {
      // Revoke the Slack OAuth token before deleting the row
      const accessToken = decryptToken(integration.accessToken)
      if (accessToken) {
        try {
          await fetch("https://slack.com/api/auth.revoke", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Bearer ${accessToken}`,
            },
            body: new URLSearchParams({ token: accessToken }),
          })
        } catch (revokeErr) {
          // Non-fatal: log but continue with DB deletion
          console.error("[SlackDisconnect] Failed to revoke token:", revokeErr)
        }
      }

      await prisma.slackIntegration.delete({
        where: { userId: session.user.id },
      })

      await createAuditLog(session.user.id, "INTEGRATION_DISCONNECTED", { provider: "slack" }, request)
    }

    return NextResponse.json({
      success: true,
      message: "Slack disconnected successfully",
    })
  } catch (error) {
    console.error("Error disconnecting Slack:", error)
    return NextResponse.json(
      { error: "Failed to disconnect Slack" },
      { status: 500 }
    )
  }
}