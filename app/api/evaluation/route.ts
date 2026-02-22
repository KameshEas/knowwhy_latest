import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get evaluation metrics for the user
    const decisions = await prisma.decision.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        confidence: true,
        source: true,
        createdAt: true,
        userRating: true,
        feedbackNote: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate metrics
    const totalDecisions = decisions.length
    const ratedDecisions = decisions.filter((d) => d.userRating !== null)
    const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / (totalDecisions || 1)
    const avgUserRating = ratedDecisions.length > 0
      ? ratedDecisions.reduce((sum, d) => sum + (d.userRating || 0), 0) / ratedDecisions.length
      : 0

    // Confidence distribution
    const highConfidence = decisions.filter((d) => d.confidence >= 0.8).length
    const mediumConfidence = decisions.filter((d) => d.confidence >= 0.5 && d.confidence < 0.8).length
    const lowConfidence = decisions.filter((d) => d.confidence < 0.5).length

    // Source distribution
    const sourceCounts = decisions.reduce((acc, d) => {
      acc[d.source] = (acc[d.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Rating distribution
    const ratingDistribution = {
      "5": ratedDecisions.filter((d) => d.userRating === 5).length,
      "4": ratedDecisions.filter((d) => d.userRating === 4).length,
      "3": ratedDecisions.filter((d) => d.userRating === 3).length,
      "2": ratedDecisions.filter((d) => d.userRating === 2).length,
      "1": ratedDecisions.filter((d) => d.userRating === 1).length,
    }

    // Recent decisions with feedback
    const recentWithFeedback = decisions
      .filter((d) => d.userRating !== null || d.feedbackNote)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      metrics: {
        totalDecisions,
        ratedDecisions: ratedDecisions.length,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgUserRating: Math.round(avgUserRating * 100) / 100,
        confidenceDistribution: {
          high: highConfidence,
          medium: mediumConfidence,
          low: lowConfidence,
        },
        sourceDistribution: sourceCounts,
        ratingDistribution,
      },
      recentWithFeedback,
    })
  } catch (error) {
    console.error("Error fetching evaluation metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch evaluation metrics" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { decisionId, rating, feedbackNote } = await request.json()

    if (!decisionId) {
      return NextResponse.json(
        { error: "Decision ID is required" },
        { status: 400 }
      )
    }

    // Verify the decision belongs to the user
    const decision = await prisma.decision.findFirst({
      where: {
        id: decisionId,
        userId: session.user.id,
      },
    })

    if (!decision) {
      return NextResponse.json(
        { error: "Decision not found" },
        { status: 404 }
      )
    }

    // Update the decision with user feedback
    const updated = await prisma.decision.update({
      where: { id: decisionId },
      data: {
        userRating: rating !== undefined ? rating : undefined,
        feedbackNote: feedbackNote !== undefined ? feedbackNote : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Feedback saved successfully",
      decision: {
        id: updated.id,
        userRating: updated.userRating,
        feedbackNote: updated.feedbackNote,
      },
    })
  } catch (error) {
    console.error("Error saving evaluation feedback:", error)
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    )
  }
}
