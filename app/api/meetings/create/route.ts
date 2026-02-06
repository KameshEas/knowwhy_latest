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

    console.log("Account found:", account ? "Yes" : "No")
    console.log("Access token exists:", account?.access_token ? "Yes" : "No")
    console.log("Refresh token exists:", account?.refresh_token ? "Yes" : "No")

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "Google account not connected or token missing. Please sign out and sign back in." },
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

    try {
      // Create event in Google Calendar with Google Meet
      // Pass refresh token and client credentials for automatic token refresh
      const calendarEvent = await createGoogleCalendarEvent(
        account.access_token,
        {
          summary: title,
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          attendees: attendees || [],
        },
        account.refresh_token || undefined,
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )

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
    } catch (calendarError: any) {
      console.error("Calendar API Error:", calendarError)
      
      // Check for insufficient scopes error
      if (calendarError.message?.includes("insufficient authentication scopes") || 
          calendarError.code === 403) {
        return NextResponse.json(
          { 
            error: "Google Calendar permission required. Please sign out and sign back in to grant calendar write access.",
            code: "INSUFFICIENT_SCOPES"
          },
          { status: 403 }
        )
      }
      
      // Check for invalid credentials
      if (calendarError.code === 401) {
        return NextResponse.json(
          { 
            error: "Google session expired or invalid. Please sign out and sign back in.",
            code: "INVALID_CREDENTIALS"
          },
          { status: 401 }
        )
      }
      
      throw calendarError
    }
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    )
  }
}