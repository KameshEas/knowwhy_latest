import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
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
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: account.access_token })
        const calendar = google.calendar({ version: "v3", auth: oauth2Client })

        await calendar.events.delete({
          calendarId: "primary",
          eventId: meeting.googleEventId,
        })
      } catch (calendarError) {
        console.error("Failed to delete from Google Calendar:", calendarError)
        // Continue to delete from our database even if Google Calendar fails
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