import { auth } from "@/auth"
import { getGitLabProjects } from "@/lib/gitlab"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await getGitLabProjects(session.user.id)

    return NextResponse.json({
      success: true,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        path: project.path_with_namespace,
        description: project.description,
        visibility: project.visibility,
        createdAt: project.created_at,
        lastActivityAt: project.last_activity_at,
        webUrl: project.web_url,
      })),
    })
  } catch (error) {
    console.error("Error fetching GitLab projects:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 500 }
    )
  }
}