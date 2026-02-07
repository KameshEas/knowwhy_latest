import { auth } from "@/auth"
import { getSlackChannelMessages } from "@/lib/slack"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { limit = 50 } = await request.json()

    // Fetch messages from Slack
    const messages = await getSlackChannelMessages(
      session.user.id,
      params.channelId,
      limit
    )

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: "No messages found in channel",
      })
    }

    // Format messages as a conversation
    const conversation = messages
      .filter((msg: any) => msg.type === "message" && msg.text)
      .map((msg: any) => `${msg.user}: ${msg.text}`)
      .join("\n\n")

    if (!conversation.trim()) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: "No valid messages to analyze",
      })
    }

    // First detect if there's a decision
    const detection = await detectDecision(conversation)

    if (!detection.isDecision || detection.confidence < 0.6) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: "No clear decisions detected in this conversation",
        confidence: detection.confidence,
      })
    }

    // Generate full decision brief
    const brief = await generateDecisionBrief(conversation, "Slack Discussion")

    // Save decision to database
    const savedDecision = await prisma.decision.create({
      data: {
        userId: session.user.id,
        title: brief.title,
        summary: brief.summary,
        problemStatement: brief.problemStatement,
        optionsDiscussed: brief.optionsDiscussed,
        finalDecision: brief.finalDecision,
        rationale: brief.rationale,
        actionItems: brief.actionItems,
        confidence: detection.confidence,
        source: "slack",
        sourceLink: `https://slack.com/app_redirect?channel=${params.channelId}`,
      },
    })

    return NextResponse.json({
      success: true,
      decision: savedDecision,
      detected: true,
      confidence: detection.confidence,
    })
  } catch (error) {
    console.error("Error analyzing Slack messages:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze messages" },
      { status: 500 }
    )
  }
}