import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCalendarEvents } from "@/lib/google-calendar"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's account with Google access token
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    })

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "Google account not connected" },
        { status: 400 }
      )
    }

    // Fetch calendar events with Meet links
    const events = await getCalendarEvents(account.access_token)

    // Store meetings in database
    const meetings = await Promise.all(
      events.map(async (event) => {
        const startTime = event.start.dateTime
          ? new Date(event.start.dateTime)
          : event.start.date
          ? new Date(event.start.date)
          : new Date()

        const endTime = event.end.dateTime
          ? new Date(event.end.dateTime)
          : event.end.date
          ? new Date(event.end.date)
          : new Date(startTime.getTime() + 3600000) // Default 1 hour

        return prisma.meeting.upsert({
          where: {
            googleEventId: event.id,
          },
          update: {
            title: event.summary,
            description: event.description,
            startTime,
            endTime,
            meetLink: event.hangoutLink,
          },
          create: {
            userId: session.user.id,
            googleEventId: event.id,
            title: event.summary,
            description: event.description,
            startTime,
            endTime,
            meetLink: event.hangoutLink,
            status: "pending",
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      count: meetings.length,
      meetings,
    })
  } catch (error) {
    console.error("Error syncing meetings:", error)
    return NextResponse.json(
      { error: "Failed to sync meetings" },
      { status: 500 }
    )
  }
}