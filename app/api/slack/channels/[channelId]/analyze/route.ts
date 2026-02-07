import { auth } from "@/auth"
import { getSlackChannelMessages } from "@/lib/slack"
import { analyzeTranscript } from "@/lib/groq"
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

    // Analyze with Groq AI
    const analysis = await analyzeTranscript(conversation)

    if (!analysis || analysis.decisions.length === 0) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: "No decisions detected in this conversation",
      })
    }

    // Save decisions to database
    const savedDecisions = await Promise.all(
      analysis.decisions.map(async (decision) => {
        return prisma.decision.create({
          data: {
            userId: session.user.id,
            title: decision.title,
            summary: decision.summary,
            problemStatement: decision.problemStatement,
            optionsDiscussed: decision.optionsDiscussed,
            finalDecision: decision.finalDecision,
            rationale: decision.rationale,
            actionItems: decision.actionItems,
            confidence: decision.confidence,
            source: "slack",
            sourceLink: `https://slack.com/app_redirect?channel=${params.channelId}`,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      decisions: savedDecisions,
      count: savedDecisions.length,
    })
  } catch (error) {
    console.error("Error analyzing Slack messages:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze messages" },
      { status: 500 }
    )
  }
}