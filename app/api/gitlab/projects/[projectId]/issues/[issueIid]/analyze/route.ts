import { auth } from "@/auth"
import { getGitLabIssueNotes, getGitLabIssues } from "@/lib/gitlab"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; issueIid: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, issueIid } = await params

    // Fetch issue notes (comments/discussions)
    const notes = await getGitLabIssueNotes(
      session.user.id,
      parseInt(projectId),
      parseInt(issueIid)
    )

    // Also fetch issue details to get the title and description
    const issues = await getGitLabIssues(session.user.id, parseInt(projectId))
    const issue = issues.find((i) => i.iid === parseInt(issueIid))

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    // Build conversation from issue title, description, and notes
    let conversation = `Issue: ${issue.title}\n\n`
    
    if (issue.description) {
      conversation += `Description:\n${issue.description}\n\n`
    }

    // Add notes/discussions
    if (notes && notes.length > 0) {
      conversation += "Discussion:\n"
      notes
        .filter((note) => !note.system) // Filter out system notes
        .forEach((note) => {
          conversation += `${note.author.name}: ${note.body}\n\n`
        })
    }

    if (!conversation.trim() || notes.filter((n) => !n.system).length === 0) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: "No discussion found in this issue to analyze",
      })
    }

    // Detect decision using AI
    const detection = await detectDecision(conversation)

    if (!detection.isDecision || detection.confidence < 0.6) {
      return NextResponse.json({
        success: true,
        decisions: [],
        message: "No clear decisions detected in this issue discussion",
        confidence: detection.confidence,
      })
    }

    // Generate full decision brief
    const brief = await generateDecisionBrief(conversation, `GitLab Issue: ${issue.title}`)

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
        source: "gitlab",
        sourceLink: issue.web_url,
      },
    })

    return NextResponse.json({
      success: true,
      decision: savedDecision,
      detected: true,
      confidence: detection.confidence,
    })
  } catch (error) {
    console.error("Error analyzing GitLab issue:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze issue" },
      { status: 500 }
    )
  }
}