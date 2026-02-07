import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientId = process.env.SLACK_CLIENT_ID
    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Slack integration not configured" },
        { status: 500 }
      )
    }

    // Generate state parameter for security
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64")

    // User scopes only (no bot scopes - don't require bot user)
    const scopes = ["channels:history", "groups:history", "users:read"]

    const authUrl = new URL("https://slack.com/oauth/v2/authorize")
    authUrl.searchParams.append("client_id", clientId)
    authUrl.searchParams.append("scope", scopes.join(","))
    authUrl.searchParams.append("redirect_uri", redirectUri)
    authUrl.searchParams.append("state", state)

    return NextResponse.json({
      success: true,
      url: authUrl.toString(),
    })
  } catch (error) {
    console.error("Error generating Slack auth URL:", error)
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    )
  }
}