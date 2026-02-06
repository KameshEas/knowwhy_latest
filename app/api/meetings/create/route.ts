import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createGoogleCalendarEvent } from "@/lib/google-calendar"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { title, description, startTime, endTime, attendees } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      )
    }

    // Create event in Google Calendar with Google Meet
    const calendarEvent = await createGoogleCalendarEvent(account.access_token, {
      summary: title,
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      attendees: attendees || [],
    })

    // Store meeting in database
    const meeting = await prisma.meeting.create({
      data: {
        userId: session.user.id,
        googleEventId: calendarEvent.id,
        title: calendarEvent.summary,
        description: calendarEvent.description,
        startTime: new Date(calendarEvent.start.dateTime || startTime),
        endTime: new Date(calendarEvent.end.dateTime || endTime),
        meetLink: calendarEvent.hangoutLink,
        status: "pending",
      },
    })

    return NextResponse.json({
      success: true,
      meeting,
      meetLink: calendarEvent.hangoutLink,
    })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    )
  }
}