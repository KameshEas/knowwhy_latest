import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"

// Sample conversation for testing AI analysis
const SAMPLE_CONVERSATION = `Alice: We need to decide on the new database approach for the project.
Bob: I think we should use PostgreSQL since it's more mature.
Charlie: I agree with Bob, PostgreSQL has better JSON support.
Alice: What about MongoDB? It might be simpler for our use case.
Bob: But we need ACID compliance for transactions.
Charlie: True, let's go with PostgreSQL.
Alice: Okay, final decision is PostgreSQL for our main database.`

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { provider } = body

    if (!provider || !["slack", "gitlab"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Use 'slack' or 'gitlab'" },
        { status: 400 }
      )
    }

    // Verify the integration is connected
    if (provider === "slack") {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      })

      if (!integration) {
        return NextResponse.json(
          { error: "Slack not connected. Please connect Slack first." },
          { status: 400 }
        )
      }
    }

    if (provider === "gitlab") {
      const integration = await prisma.gitLabIntegration.findUnique({
        where: { userId },
      })

      if (!integration) {
        return NextResponse.json(
          { error: "GitLab not connected. Please connect GitLab first." },
          { status: 400 }
        )
      }
    }

    console.log(`[WebhookTest] Testing ${provider} webhook for user ${userId}`)

    // Run AI analysis on sample conversation
    const detection = await detectDecision(SAMPLE_CONVERSATION)

    if (detection.isDecision && detection.confidence >= 0.6) {
      const brief = await generateDecisionBrief(
        SAMPLE_CONVERSATION,
        provider === "slack" ? "Slack Test Channel" : "GitLab Test Issue"
      )

      // Save a test decision
      const decision = await prisma.decision.create({
        data: {
          userId,
          title: `[TEST] ${brief.title}`,
          summary: brief.summary,
          problemStatement: brief.problemStatement,
          optionsDiscussed: brief.optionsDiscussed,
          finalDecision: brief.finalDecision,
          rationale: brief.rationale,
          actionItems: brief.actionItems,
          confidence: detection.confidence,
          source: provider,
          sourceLink: provider === "slack" 
            ? "https://slack.com/test-channel" 
            : "https://gitlab.com/test-project/-/issues/1",
        },
      })

      // Delete the test decision after a short delay (cleanup)
      setTimeout(async () => {
        try {
          await prisma.decision.delete({ where: { id: decision.id } })
          console.log(`[WebhookTest] Cleaned up test decision ${decision.id}`)
        } catch (e) {
          console.error("[WebhookTest] Failed to cleanup test decision:", e)
        }
      }, 60000) // Delete after 1 minute

      return NextResponse.json({
        success: true,
        message: "Webhook test successful! AI analysis is working correctly.",
        testResult: {
          decisionDetected: true,
          confidence: detection.confidence,
          title: brief.title,
          summary: brief.summary,
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook endpoint is reachable. AI analysis completed but no decision was detected in sample.",
      testResult: {
        decisionDetected: false,
        confidence: detection.confidence,
      }
    })

  } catch (error) {
    console.error("[WebhookTest] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    )
  }
}
