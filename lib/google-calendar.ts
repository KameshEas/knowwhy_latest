import { google } from "googleapis"

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string | null; date?: string | null }
  end: { dateTime?: string | null; date?: string | null }
  hangoutLink?: string
  attendees?: { email?: string | null; displayName?: string | null; responseStatus?: string | null }[]
}

export async function getCalendarEvents(
  accessToken: string,
  timeMin: string = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  timeMax: string = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()  // 30 days ahead
): Promise<CalendarEvent[]> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
    })

    const events = response.data.items || []
    
    // Filter events that have Google Meet links
    return events
      .filter((event) => event.hangoutLink || event.conferenceData)
      .map((event) => ({
        id: event.id || "",
        summary: event.summary || "Untitled Meeting",
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || null,
          date: event.start?.date || null,
        },
        end: {
          dateTime: event.end?.dateTime || null,
          date: event.end?.date || null,
        },
        hangoutLink: event.hangoutLink || undefined,
        attendees: event.attendees?.map((attendee) => ({
          email: attendee.email || null,
          displayName: attendee.displayName || null,
          responseStatus: attendee.responseStatus || null,
        })),
      }))
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    throw error
  }
}