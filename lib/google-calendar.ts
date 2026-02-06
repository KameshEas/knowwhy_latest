import { google } from "googleapis"
import { prisma } from "./prisma"

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string | null; date?: string | null }
  end: { dateTime?: string | null; date?: string | null }
  hangoutLink?: string
  attendees?: { email?: string | null; displayName?: string | null; responseStatus?: string | null }[]
}

export interface CreateEventInput {
  summary: string
  description?: string
  startTime: string
  endTime: string
  attendees?: string[]
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials.access_token!
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  eventData: CreateEventInput,
  refreshToken?: string,
  clientId?: string,
  clientSecret?: string
): Promise<CalendarEvent> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  try {
    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: "Asia/Calcutta",
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: "Asia/Calcutta",
      },
      attendees: eventData.attendees?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
    })

    const createdEvent = response.data

    return {
      id: createdEvent.id || "",
      summary: createdEvent.summary || "",
      description: createdEvent.description || undefined,
      start: {
        dateTime: createdEvent.start?.dateTime || null,
        date: createdEvent.start?.date || null,
      },
      end: {
        dateTime: createdEvent.end?.dateTime || null,
        date: createdEvent.end?.date || null,
      },
      hangoutLink: createdEvent.hangoutLink || undefined,
      attendees: createdEvent.attendees?.map((attendee) => ({
        email: attendee.email || null,
        displayName: attendee.displayName || null,
        responseStatus: attendee.responseStatus || null,
      })),
    }
  } catch (error: any) {
    // If token expired and we have refresh token, try refreshing
    if (error.code === 401 && refreshToken && clientId && clientSecret) {
      console.log("Access token expired, attempting to refresh...")
      try {
        const newAccessToken = await refreshAccessToken(refreshToken, clientId, clientSecret)
        
        // Retry with new token
        oauth2Client.setCredentials({ access_token: newAccessToken })
        
        const event = {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.startTime,
            timeZone: "Asia/Calcutta",
          },
          end: {
            dateTime: eventData.endTime,
            timeZone: "Asia/Calcutta",
          },
          attendees: eventData.attendees?.map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        }

        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event,
          conferenceDataVersion: 1,
        })

        const createdEvent = response.data

        return {
          id: createdEvent.id || "",
          summary: createdEvent.summary || "",
          description: createdEvent.description || undefined,
          start: {
            dateTime: createdEvent.start?.dateTime || null,
            date: createdEvent.start?.date || null,
          },
          end: {
            dateTime: createdEvent.end?.dateTime || null,
            date: createdEvent.end?.date || null,
          },
          hangoutLink: createdEvent.hangoutLink || undefined,
          attendees: createdEvent.attendees?.map((attendee) => ({
            email: attendee.email || null,
            displayName: attendee.displayName || null,
            responseStatus: attendee.responseStatus || null,
          })),
        }
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError)
        throw error // Throw original error
      }
    }
    throw error
  }
}

export async function getCalendarEvents(
  accessToken: string,
  timeMin: string = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  timeMax: string = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  refreshToken?: string,
  clientId?: string,
  clientSecret?: string
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
  } catch (error: any) {
    // If token expired and we have refresh token, try refreshing
    if (error.code === 401 && refreshToken && clientId && clientSecret) {
      console.log("Access token expired, attempting to refresh...")
      try {
        const newAccessToken = await refreshAccessToken(refreshToken, clientId, clientSecret)
        
        // Retry with new token
        oauth2Client.setCredentials({ access_token: newAccessToken })
        
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin,
          timeMax,
          maxResults: 100,
          singleEvents: true,
          orderBy: "startTime",
        })

        const events = response.data.items || []
        
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
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError)
        throw error
      }
    }
    throw error
  }
}