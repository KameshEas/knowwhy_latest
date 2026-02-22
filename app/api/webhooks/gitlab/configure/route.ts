import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface GitLabWebhook {
  id: number
  url: string
  create_if_empty: boolean
  push_events: boolean
  tag_push_events: boolean
  merge_requests_events: boolean
  issues_events: boolean
  note_events: boolean
  job_events: boolean
  pipeline_events: boolean
  wiki_page_events: boolean
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { projectId, webhookUrl } = body

    // Get user's GitLab integration
    const gitlabIntegration = await prisma.gitLabIntegration.findUnique({
      where: { userId },
    })

    if (!gitlabIntegration) {
      return NextResponse.json(
        { error: "GitLab not connected. Please connect GitLab first." },
        { status: 400 }
      )
    }

    if (!projectId || !webhookUrl) {
      return NextResponse.json(
        { error: "projectId and webhookUrl are required" },
        { status: 400 }
      )
    }

    console.log(`[GitLabConfigure] Setting up webhook for project ${projectId}`)

    // First, get the list of existing webhooks to check if ours already exists
    const listResponse = await fetch(
      `${gitlabIntegration.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId)}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${gitlabIntegration.accessToken}`,
        },
      }
    )

    if (!listResponse.ok) {
      const error = await listResponse.text()
      console.error("[GitLabConfigure] Failed to list hooks:", error)
      return NextResponse.json(
        { error: "Failed to fetch existing webhooks" },
        { status: 400 }
      )
    }

    const existingHooks: GitLabWebhook[] = await listResponse.json()

    // Check if webhook already exists
    const existingWebhook = existingHooks.find(
      (hook) => hook.url === webhookUrl
    )

    if (existingWebhook) {
      return NextResponse.json({
        success: true,
        message: "Webhook already configured",
        webhookId: existingWebhook.id,
      })
    }

    // Create new webhook
    const createResponse = await fetch(
      `${gitlabIntegration.gitlabUrl}/api/v4/projects/${encodeURIComponent(projectId)}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gitlabIntegration.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          push_events: false,
          tag_push_events: false,
          merge_requests_events: true,
          issues_events: true,
          note_events: false,
          job_events: false,
          pipeline_events: false,
          wiki_page_events: false,
        }),
      }
    )

    if (!createResponse.ok) {
      const error = await createResponse.text()
      console.error("[GitLabConfigure] Failed to create hook:", error)
      return NextResponse.json(
        { error: "Failed to create webhook. Make sure you have project maintainer permissions." },
        { status: 400 }
      )
    }

    const newWebhook: GitLabWebhook = await createResponse.json()

    console.log(`[GitLabConfigure] Created webhook ${newWebhook.id}`)

    return NextResponse.json({
      success: true,
      message: "Webhook configured successfully!",
      webhookId: newWebhook.id,
    })
  } catch (error) {
    console.error("[GitLabConfigure] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configuration failed" },
      { status: 500 }
    )
  }
}

// GET: List available projects and their webhook status
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's GitLab integration
    const gitlabIntegration = await prisma.gitLabIntegration.findUnique({
      where: { userId },
    })

    if (!gitlabIntegration) {
      return NextResponse.json(
        { error: "GitLab not connected" },
        { status: 400 }
      )
    }

    // Get all projects the user has access to
    const projectsResponse = await fetch(
      `${gitlabIntegration.gitlabUrl}/api/v4/projects?membership=true&per_page=20&order_by=last_activity_at&sort=desc`,
      {
        headers: {
          Authorization: `Bearer ${gitlabIntegration.accessToken}`,
        },
      }
    )

    if (!projectsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 400 }
      )
    }

    const projects = await projectsResponse.json()

    // Get webhook URL for comparison
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || ""
    const webhookUrl = `${baseUrl}/api/webhooks/gitlab`

    // For each project, check if webhook exists
    const projectsWithWebhookStatus = await Promise.all(
      projects.slice(0, 10).map(async (project: any) => {
        try {
          const hooksResponse = await fetch(
            `${gitlabIntegration.gitlabUrl}/api/v4/projects/${project.id}/hooks`,
            {
              headers: {
                Authorization: `Bearer ${gitlabIntegration.accessToken}`,
              },
            }
          )

          if (hooksResponse.ok) {
            const hooks: GitLabWebhook[] = await hooksResponse.json()
            const webhookExists = hooks.some((hook) => hook.url === webhookUrl)
            return {
              id: project.id,
              name: project.name,
              path: project.path_with_namespace,
              webUrl: project.web_url,
              lastActivityAt: project.last_activity_at,
              webhookConfigured: webhookExists,
            }
          }
        } catch (e) {
          console.error(`[GitLabConfigure] Error checking hooks for project ${project.id}:`, e)
        }

        return {
          id: project.id,
          name: project.name,
          path: project.path_with_namespace,
          webUrl: project.web_url,
          lastActivityAt: project.last_activity_at,
          webhookConfigured: false,
        }
      })
    )

    return NextResponse.json({
      success: true,
      projects: projectsWithWebhookStatus,
      webhookUrl,
    })
  } catch (error) {
    console.error("[GitLabConfigure] GET Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}
