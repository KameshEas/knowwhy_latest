import { auth } from "@/auth"
import { getGitLabIssues } from "@/lib/gitlab"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state") || "all"

    const issues = await getGitLabIssues(
      session.user.id,
      parseInt(projectId),
      state
    )

    return NextResponse.json({
      success: true,
      issues: issues.map((issue) => ({
        id: issue.id,
        iid: issue.iid,
        title: issue.title,
        description: issue.description,
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at,
        author: issue.author,
        assignees: issue.assignees,
        labels: issue.labels,
        webUrl: issue.web_url,
        userNotesCount: issue.user_notes_count,
      })),
    })
  } catch (error) {
    console.error("Error fetching GitLab issues:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch issues" },
      { status: 500 }
    )
  }
}