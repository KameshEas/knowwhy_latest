import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, startTime, endTime, meetLink } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      )
    }

    // Create a unique googleEventId for manual meetings
    const googleEventId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const meeting = await prisma.meeting.create({
      data: {
        userId: session.user.id,
        googleEventId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetLink: meetLink || null,
        status: "pending",
      },
    })

    return NextResponse.json({
      success: true,
      meeting,
    })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    )
  }
}