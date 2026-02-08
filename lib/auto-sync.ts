import { prisma } from "./prisma"
import { getSlackChannels, getSlackChannelMessages } from "./slack"
import { getGitLabProjects, getGitLabIssues, getGitLabIssueNotes } from "./gitlab"
import { getCalendarEvents } from "./google-calendar"
import { detectDecision, generateDecisionBrief } from "./groq"

interface SyncResult {
  source: string
  itemsProcessed: number
  decisionsFound: number
  errors?: string
}

/**
 * Comprehensive auto-sync service that fetches and analyzes decisions from all sources
 */
export async function autoSyncAllSources(userId: string): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  // Sync Slack
  try {
    const slackResult = await autoSyncSlack(userId)
    results.push(slackResult)
  } catch (error) {
    results.push({
      source: "slack",
      itemsProcessed: 0,
      decisionsFound: 0,
      errors: error instanceof Error ? error.message : "Slack sync failed",
    })
  }

  // Sync GitLab
  try {
    const gitlabResult = await autoSyncGitLab(userId)
    results.push(gitlabResult)
  } catch (error) {
    results.push({
      source: "gitlab",
      itemsProcessed: 0,
      decisionsFound: 0,
      errors: error instanceof Error ? error.message : "GitLab sync failed",
    })
  }

  // Sync Google Meet (Calendar events with Meet links)
  try {
    const meetResult = await autoSyncGoogleMeet(userId)
    results.push(meetResult)
  } catch (error) {
    results.push({
      source: "meet",
      itemsProcessed: 0,
      decisionsFound: 0,
      errors: error instanceof Error ? error.message : "Meet sync failed",
    })
  }

  return results
}

/**
 * Auto-sync Slack channels
 */
async function autoSyncSlack(userId: string): Promise<SyncResult> {
  let itemsProcessed = 0
  let decisionsFound = 0

  const channels = await getSlackChannels(userId)

  for (const channel of channels) {
    // Skip channels with very few members
    if (channel.num_members < 2) continue

    // Check if already analyzed recently (24 hours)
    const existingDecision = await prisma.decision.findFirst({
      where: {
        userId,
        source: "slack",
        sourceLink: { contains: channel.id },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (existingDecision) continue

    // Fetch messages
    const messages = await getSlackChannelMessages(userId, channel.id, 100)
    itemsProcessed += messages.length

    if (messages.length === 0) continue

    // Format conversation
    const conversation = messages
      .filter((msg: any) => msg.type === "message" && msg.text)
      .map((msg: any) => `${msg.user}: ${msg.text}`)
      .join("\n\n")

    if (!conversation.trim()) continue

    // Analyze for decisions
    const detection = await detectDecision(conversation)

    if (detection.isDecision && detection.confidence >= 0.6) {
      const brief = await generateDecisionBrief(conversation, `Slack: #${channel.name}`)

      await prisma.decision.create({
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
          source: "slack",
          sourceLink: `https://slack.com/app_redirect?channel=${channel.id}`,
        },
      })
      decisionsFound++
    }
  }

  return { source: "slack", itemsProcessed, decisionsFound }
}

/**
 * Auto-sync GitLab issues
 */
async function autoSyncGitLab(userId: string): Promise<SyncResult> {
  let itemsProcessed = 0
  let decisionsFound = 0

  const projects = await getGitLabProjects(userId)

  for (const project of projects.slice(0, 5)) { // Process up to 5 projects
    // Sync Issues
    try {
      const issues = await getGitLabIssues(userId, project.id, "all")

      for (const issue of issues.slice(0, 5)) { // Process last 5 issues per project
        // Check if already analyzed
        const existingDecision = await prisma.decision.findFirst({
          where: {
            userId,
            source: "gitlab",
            sourceLink: issue.web_url,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        })

        if (existingDecision) continue

        // Fetch notes/discussions
        const notes = await getGitLabIssueNotes(userId, project.id, issue.iid)
        itemsProcessed++

        const userNotes = notes.filter((n) => !n.system)
        if (userNotes.length === 0) continue

        // Build conversation
        let conversation = `Issue: ${issue.title}\n\n`
        if (issue.description) {
          conversation += `Description:\n${issue.description}\n\n`
        }
        conversation += "Discussion:\n"
        userNotes.forEach((note) => {
          conversation += `${note.author.name}: ${note.body}\n\n`
        })

        // Analyze
        const detection = await detectDecision(conversation)

        if (detection.isDecision && detection.confidence >= 0.6) {
          const brief = await generateDecisionBrief(conversation, `GitLab Issue: ${issue.title}`)

          await prisma.decision.create({
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
              sourceLink: issue.web_url,
            },
          })
          decisionsFound++
        }
      }
    } catch (error) {
      console.error(`Error processing project ${project.name}:`, error)
    }
  }

  return { source: "gitlab", itemsProcessed, decisionsFound }
}

/**
 * Auto-sync Google Meet events
 * Note: Full transcript analysis requires Google Workspace Enterprise license
 */
async function autoSyncGoogleMeet(userId: string): Promise<SyncResult> {
  let itemsProcessed = 0
  let decisionsFound = 0

  try {
    // Get the user's Google account
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    })

    if (!googleAccount?.access_token) {
      return { source: "meet", itemsProcessed: 0, decisionsFound: 0, errors: "Google not connected" }
    }

    // Get events from last 7 days
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 7)

    const events = await getCalendarEvents(
      googleAccount.access_token,
      timeMin.toISOString(),
      new Date().toISOString()
    )

    for (const event of events) {
      itemsProcessed++

      // Check if already analyzed (using googleEventId)
      const existingMeeting = await prisma.meeting.findFirst({
        where: {
          userId,
          googleEventId: event.id,
        },
      })

      if (existingMeeting) continue

      // Note: To get actual transcripts, you would need:
      // 1. Google Workspace Enterprise license
      // 2. Access to Google Meet Recording API
      // 3. Process the transcript with AI

      // For now, we just log that we found a meeting
      console.log(`Found meeting: ${event.summary} (${event.id})`)
    }

    console.log(`Google Meet sync: Processed ${itemsProcessed} meetings`)

  } catch (error) {
    console.error("Google Meet sync error:", error)
    throw error
  }

  return { source: "meet", itemsProcessed, decisionsFound }
}
