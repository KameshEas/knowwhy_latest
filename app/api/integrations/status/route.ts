import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check Google Calendar (via Account model)
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    })

    // Check Slack integration
    const slackIntegration = await prisma.slackIntegration.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    // Check GitLab integration
    const gitlabIntegration = await prisma.gitLabIntegration.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      status: {
        google: !!googleAccount,
        slack: !!slackIntegration,
        gitlab: !!gitlabIntegration,
      },
      slack: slackIntegration
        ? {
            teamName: slackIntegration.teamName,
            userSlackId: slackIntegration.userSlackId,
            connectedAt: slackIntegration.connectedAt,
            lastSyncAt: slackIntegration.lastSyncAt,
          }
        : null,
      gitlab: gitlabIntegration
        ? {
            username: gitlabIntegration.username,
            gitlabUrl: gitlabIntegration.gitlabUrl,
            connectedAt: gitlabIntegration.connectedAt,
            lastSyncAt: gitlabIntegration.lastSyncAt,
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching integration status:", error)
    return NextResponse.json(
      { error: "Failed to fetch integration status" },
      { status: 500 }
    )
  }
}