import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"
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

    // Await params if it's a promise
    const resolvedParams = await Promise.resolve(params)
    const meetingId = resolvedParams.id

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID required" }, { status: 400 })
    }

    // Get the meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId: session.user.id,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Check if transcript exists
    if (!meeting.transcript) {
      return NextResponse.json(
        { error: "No transcript available for this meeting" },
        { status: 400 }
      )
    }

    // First, detect if there's a decision
    const detectionResult = await detectDecision(meeting.transcript)

    if (!detectionResult.isDecision || detectionResult.confidence < 0.7) {
      return NextResponse.json({
        success: false,
        message: "No clear decision detected in this meeting",
        confidence: detectionResult.confidence,
      })
    }

    // Generate full decision brief
    const brief = await generateDecisionBrief(meeting.transcript, meeting.title)

    // Create decision record
    const decision = await prisma.decision.create({
      data: {
        meetingId: meeting.id,
        userId: session.user.id,
        title: brief.title,
        summary: brief.summary,
        problemStatement: brief.problemStatement,
        optionsDiscussed: brief.optionsDiscussed,
        finalDecision: brief.finalDecision,
        rationale: brief.rationale,
        actionItems: brief.actionItems,
        confidence: detectionResult.confidence,
      },
    })

    return NextResponse.json({
      success: true,
      decision,
      brief,
    })
  } catch (error) {
    console.error("Error analyzing meeting:", error)
    return NextResponse.json(
      { error: "Failed to analyze meeting" },
      { status: 500 }
    )
  }
}