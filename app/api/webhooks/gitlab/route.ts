import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { detectDecision, generateDecisionBrief } from "@/lib/groq"
import { sendDecisionNotification } from "@/lib/notifications"

// Verify GitLab webhook token
function verifyGitLabRequest(token: string, expectedToken: string): boolean {
  return token === expectedToken
}

interface GitLabIssueEvent {
  object_kind: string
  event_name: string
  project: {
    id: number
    name: string
    web_url: string
    path_with_namespace: string
  }
  object_attributes: {
    id: number
    iid: number
    title: string
    description: string
    state: string
    action: string
    url: string
  }
  user: {
    id: number
    name: string
    username: string
  }
  notes: Array<{
    id: number
    body: string
    author: {
      name: string
      username: string
    }
    created_at: string
  }>
}

interface GitLabMREvent {
  object_kind: string
  event_name: string
  project: {
    id: number
    name: string
    web_url: string
    path_with_namespace: string
  }
  object_attributes: {
    id: number
    iid: number
    title: string
    description: string
    state: string
    action: string
    url: string
    source_branch: string
    target_branch: string
  }
  user: {
    id: number
    name: string
    username: string
  }
  notes: Array<{
    id: number
    body: string
    author: {
      name: string
      username: string
    }
    created_at: string
  }>
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-gitlab-token") || ""
    const secretToken = process.env.GITLAB_WEBHOOK_SECRET

    // Verify request is from GitLab
    if (secretToken && token !== secretToken) {
      console.error("[GitLabWebhook] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const payload = await request.json() as GitLabIssueEvent | GitLabMREvent

    console.log("[GitLabWebhook] Received event:", {
      objectKind: payload.object_kind,
      eventName: payload.event_name,
      project: payload.project?.name,
    })

    // Find the user who has this GitLab instance connected
    const gitlabIntegration = await prisma.gitLabIntegration.findFirst({
      where: {
        gitlabUrl: {
          contains: payload.project?.web_url?.split("/").slice(0, 3).join("/") || "",
        },
      },
    })

    if (!gitlabIntegration) {
      console.log("[GitLabWebhook] No integration found for project")
      return NextResponse.json({ message: "Integration not found" }, { status: 200 })
    }

    const userId = gitlabIntegration.userId

    // Handle Issue events
    if (payload.object_kind === "issue" && payload.event_name === "open" || payload.event_name === "update") {
      const issue = payload.object_attributes
      
      // Only process new or reopened issues
      if (issue.action !== "open" && issue.action !== "reopen") {
        return NextResponse.json({ message: "Issue action not handled" }, { status: 200 })
      }

      console.log("[GitLabWebhook] Processing issue:", issue.iid, issue.title)

      // Check if recently analyzed
      const recentDecision = await prisma.decision.findFirst({
        where: {
          userId,
          source: "gitlab",
          sourceLink: { contains: issue.url },
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
      })

      if (recentDecision) {
        return NextResponse.json({ message: "Recently analyzed" }, { status: 200 })
      }

      // Fetch issue notes/comments
      try {
        const notesResponse = await fetch(
          `${gitlabIntegration.gitlabUrl}/api/v4/projects/${payload.project.id}/issues/${issue.iid}/notes?per_page=50`,
          {
            headers: {
              Authorization: `Bearer ${gitlabIntegration.accessToken}`,
            },
          }
        )

        const notes = await notesResponse.json()
        
        // Build conversation context
        let conversation = `Issue Title: ${issue.title}\n`
        conversation += `Issue State: ${issue.state}\n`
        if (issue.description) {
          conversation += `\nDescription:\n${issue.description}\n\n`
        }

        if (notes && Array.isArray(notes) && notes.length > 0) {
          conversation += "Discussion:\n"
          notes
            .filter((n: any) => !n.system)
            .forEach((note: any) => {
              conversation += `${note.author.name}: ${note.body}\n\n`
            })
        }

        // Log the webhook event
        const webhookLog = await prisma.webhookLog.create({
          data: {
            userId,
            source: "gitlab",
            eventType: "issue",
            payload: JSON.stringify({ projectId: payload.project.id, issueIid: issue.iid }),
            status: "pending",
          },
        })

        // Analyze for decisions
        console.log("[GitLabWebhook] Analyzing issue for decisions...")
        const detection = await detectDecision(conversation)

        if (detection.isDecision && detection.confidence >= 0.6) {
          const brief = await generateDecisionBrief(conversation, `GitLab Issue: ${issue.title}`)

          const decision = await prisma.decision.create({
            data: {
              userId,
              title: brief.title,
              summary: brief.summary,
              problemStatement: brief.problemStatement,
              optionsDiscussed: brief.optionsDiscussed,
              finalDecision: brief.finalDecision,
              rationale: brief.rationale,
              actionItems: brief.actionItems,
              confidence: detection.confidence,
              source: "gitlab",
              sourceLink: issue.url,
            },
          })

          // Update webhook log
          await prisma.webhookLog.update({
            where: { id: webhookLog.id },
            data: {
              status: "processed",
              decisionId: decision.id,
              decisionTitle: decision.title,
              confidence: detection.confidence,
              processedAt: new Date(),
            },
          })

          // Send notification
          await sendDecisionNotification({
            userId,
            type: "decision_detected",
            title: decision.title,
            message: `A new decision was detected from GitLab Issue #${issue.iid} with ${Math.round(detection.confidence * 100)}% confidence.`,
            decisionId: decision.id,
            source: "gitlab",
          })

          console.log("[GitLabWebhook] ✅ Decision detected:", decision.title)
          return NextResponse.json({
            success: true,
            decisionId: decision.id,
            message: "Decision detected and saved"
          })
        }

        // Update webhook log for no decision
        await prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: "processed",
            processedAt: new Date(),
          },
        })

        return NextResponse.json({ message: "No decision detected" }, { status: 200 })
      } catch (error) {
        console.error("[GitLabWebhook] Error fetching notes:", error)
        return NextResponse.json({ message: "Error processing issue" }, { status: 200 })
      }
    }

    // Handle Merge Request events
    if (payload.object_kind === "merge_request") {
      const mr = payload.object_attributes

      // Only process new or updated MRs
      if (mr.action !== "open" && mr.action !== "reopen" && mr.action !== "merge") {
        return NextResponse.json({ message: "MR action not handled" }, { status: 200 })
      }

      console.log("[GitLabWebhook] Processing MR:", mr.iid, mr.title)

      // Check if recently analyzed
      const recentDecision = await prisma.decision.findFirst({
        where: {
          userId,
          source: "gitlab",
          sourceLink: { contains: mr.url },
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
      })

      if (recentDecision) {
        return NextResponse.json({ message: "Recently analyzed" }, { status: 200 })
      }

      // Fetch MR discussions
      try {
        const discussionsResponse = await fetch(
          `${gitlabIntegration.gitlabUrl}/api/v4/projects/${payload.project.id}/merge_requests/${mr.iid}/discussions?per_page=50`,
          {
            headers: {
              Authorization: `Bearer ${gitlabIntegration.accessToken}`,
            },
          }
        )

        const discussions = await discussionsResponse.json()

        // Build conversation context
        let conversation = `Merge Request Title: ${mr.title}\n`
        conversation += `Source Branch: ${mr.source_branch} → ${mr.target_branch}\n`
        conversation += `State: ${mr.state}\n`
        if (mr.description) {
          conversation += `\nDescription:\n${mr.description}\n\n`
        }

        if (discussions && Array.isArray(discussions) && discussions.length > 0) {
          conversation += "Discussion:\n"
          discussions.forEach((discussion: any) => {
            if (discussion.notes) {
              discussion.notes.forEach((note: any) => {
                if (!note.system) {
                  conversation += `${note.author.name}: ${note.body}\n\n`
                }
              })
            }
          })
        }

        // Analyze for decisions
        console.log("[GitLabWebhook] Analyzing MR for decisions...")
        const detection = await detectDecision(conversation)

        if (detection.isDecision && detection.confidence >= 0.6) {
          const brief = await generateDecisionBrief(conversation, `GitLab MR: ${mr.title}`)

          const decision = await prisma.decision.create({
            data: {
              userId,
              title: brief.title,
              summary: brief.summary,
              problemStatement: brief.problemStatement,
              optionsDiscussed: brief.optionsDiscussed,
              finalDecision: brief.finalDecision,
              rationale: brief.rationale,
              actionItems: brief.actionItems,
              confidence: detection.confidence,
              source: "gitlab",
              sourceLink: mr.url,
            },
          })

          console.log("[GitLabWebhook] ✅ Decision detected:", decision.title)
          return NextResponse.json({
            success: true,
            decisionId: decision.id,
            message: "Decision detected and saved"
          })
        }

        return NextResponse.json({ message: "No decision detected" }, { status: 200 })
      } catch (error) {
        console.error("[GitLabWebhook] Error fetching discussions:", error)
        return NextResponse.json({ message: "Error processing MR" }, { status: 200 })
      }
    }

    return NextResponse.json({ message: "Event type not handled" }, { status: 200 })
  } catch (error) {
    console.error("[GitLabWebhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// Handle GET requests
export async function GET() {
  return NextResponse.json({
    message: "GitLab webhook endpoint is active",
    instructions: "Configure this URL in GitLab project webhook settings"
  })
}
