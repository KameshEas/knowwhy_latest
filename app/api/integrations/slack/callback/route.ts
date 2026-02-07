import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=slack_auth_failed`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/settings?error=missing_params`, request.url)
      )
    }

    // Decode state to get userId
    let userId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString())
      userId = stateData.userId

      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        return NextResponse.redirect(
          new URL(`/settings?error=expired_state`, request.url)
        )
      }
    } catch {
      return NextResponse.redirect(
        new URL(`/settings?error=invalid_state`, request.url)
      )
    }

    const clientId = process.env.SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri = process.env.SLACK_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL(`/settings?error=not_configured`, request.url)
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error("Slack OAuth error:", tokenData.error)
      return NextResponse.redirect(
        new URL(`/settings?error=token_exchange_failed`, request.url)
      )
    }

    // Save Slack integration
    await prisma.slackIntegration.upsert({
      where: {
        userId,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        userSlackId: tokenData.authed_user.id,
        scope: tokenData.scope,
        connectedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        userSlackId: tokenData.authed_user.id,
        scope: tokenData.scope,
      },
    })

    return NextResponse.redirect(
      new URL(`/settings?success=slack_connected`, request.url)
    )
  } catch (error) {
    console.error("Error handling Slack callback:", error)
    return NextResponse.redirect(
      new URL(`/settings?error=callback_failed`, request.url)
    )
  }
}