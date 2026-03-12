import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
import { safeDecryptToken, encryptToken } from "@/lib/crypto"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Await params if it's a promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params)
    const meetingId = resolvedParams.id

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID required" }, { status: 400 })
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId: session.user.id,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Get user's Google account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    })

    // Try to cancel in Google Calendar if we have access
    if (account?.access_token && meeting.googleEventId) {
      try {
        const decryptedAccessToken = safeDecryptToken(account.access_token)!
        const decryptedRefreshToken = safeDecryptToken(account.refresh_token)

        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        oauth2Client.setCredentials({ access_token: decryptedAccessToken })
        const calendar = google.calendar({ version: "v3", auth: oauth2Client })

        try {
          await calendar.events.delete({
            calendarId: "primary",
            eventId: meeting.googleEventId,
          })
        } catch (calendarError: any) {
          // If token expired (401) and we have a refresh token, attempt refresh + retry
          if (
            (calendarError?.code === 401 || calendarError?.response?.status === 401) &&
            decryptedRefreshToken &&
            process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET
          ) {
            try {
              const refreshClient = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
              )
              refreshClient.setCredentials({ refresh_token: decryptedRefreshToken })
              const { credentials } = await refreshClient.refreshAccessToken()
              const newAccessToken = credentials.access_token

              if (newAccessToken) {
                // Persist new token encrypted
                await prisma.account.update({
                  where: { id: account.id },
                  data: {
                    access_token: encryptToken(newAccessToken),
                    expires_at: credentials.expiry_date
                      ? Math.floor(Number(credentials.expiry_date) / 1000)
                      : undefined,
                  },
                })

                // retry delete with refreshed token
                oauth2Client.setCredentials({ access_token: newAccessToken })
                const calendarRetry = google.calendar({ version: "v3", auth: oauth2Client })
                await calendarRetry.events.delete({
                  calendarId: "primary",
                  eventId: meeting.googleEventId,
                })
              }
            } catch (refreshErr) {
              console.error("Failed to refresh Google access token:", refreshErr)
            }
          } else {
            console.error("Failed to delete from Google Calendar:", calendarError)
          }
        }
      } catch (err) {
        console.error("Google Calendar cancel flow error:", err)
      }
    }

    // Delete meeting from database
    await prisma.meeting.delete({
      where: {
        id: meetingId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Meeting cancelled successfully",
    })
  } catch (error) {
    console.error("Error cancelling meeting:", error)
    return NextResponse.json(
      { error: "Failed to cancel meeting" },
      { status: 500 }
    )
  }
}