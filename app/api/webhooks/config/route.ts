import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the base URL - use NEXTAUTH_URL or infer from request
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || ""

    // Return webhook URLs for user to configure
    return NextResponse.json({
      success: true,
      webhooks: {
        slack: {
          url: `${baseUrl}/api/webhooks/slack`,
          events: ["message.posted", "message.app_mention"],
          instructions: "Configure in Slack App → Event Subscriptions → Enable events → Subscribe to message.channels",
          setupSteps: [
            "1. Go to https://api.slack.com/apps",
            "2. Select your Slack App",
            "3. Go to Event Subscriptions",
            "4. Enable events",
            "5. Subscribe to message.channels",
            "6. Add your webhook URL above",
            "7. Save changes"
          ]
        },
        gitlab: {
          url: `${baseUrl}/api/webhooks/gitlab`,
          events: ["issue events", "merge request events"],
          instructions: "Configure in GitLab → Project Settings → Webhooks",
          setupSteps: [
            "1. Go to your GitLab project",
            "2. Go to Settings → Webhooks",
            "3. Add new webhook",
            "4. Enter the URL above",
            "5. Select events: Issues, Merge requests",
            "6. Add webhook secret token (optional)",
            "7. Save"
          ]
        }
      },
      environmentVariables: {
        slack: {
          required: ["SLACK_SIGNING_SECRET"],
          optional: []
        },
        gitlab: {
          required: ["GITLAB_WEBHOOK_SECRET"],
          optional: []
        }
      },
      features: {
        realtimeAnalysis: "Decisions are analyzed in real-time when new events occur",
        cooldown: "30 minute cooldown between analyses per channel/issue",
        automaticSaving: "Detected decisions are automatically saved to your library"
      }
    })
  } catch (error) {
    console.error("[WebhookConfig] Error:", error)
    return NextResponse.json(
      { error: "Failed to get webhook config" },
      { status: 500 }
    )
  }
}
