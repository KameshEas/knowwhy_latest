import { prisma } from "./prisma"
import { getSlackChannels, getSlackChannelMessages } from "./slack"
import { getGitLabProjects, getGitLabIssues, getGitLabIssueNotes } from "./gitlab"
import { getCalendarEvents } from "./google-calendar"
import { detectDecision, generateDecisionBrief } from "./groq"
import { addDecisionToWeaviate, ensureDecisionSchema } from "./weaviate"

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
  console.log(`[AutoSync] Starting sync for user: ${userId}`)
  const results: SyncResult[] = []

  // Sync Slack
  try {
    console.log("[AutoSync] Starting Slack sync...")
    const slackResult = await autoSyncSlack(userId)
    results.push(slackResult)
    console.log(`[AutoSync] Slack sync complete: ${slackResult.itemsProcessed} items, ${slackResult.decisionsFound} decisions`)
  } catch (error) {
    console.error("[AutoSync] Slack sync failed:", error)
    results.push({
      source: "slack",
      itemsProcessed: 0,
      decisionsFound: 0,
      errors: error instanceof Error ? error.message : "Slack sync failed",
    })
  }

  // Sync GitLab
  try {
    console.log("[AutoSync] Starting GitLab sync...")
    const gitlabResult = await autoSyncGitLab(userId)
    results.push(gitlabResult)
    console.log(`[AutoSync] GitLab sync complete: ${gitlabResult.itemsProcessed} items, ${gitlabResult.decisionsFound} decisions`)
  } catch (error) {
    console.error("[AutoSync] GitLab sync failed:", error)
    results.push({
      source: "gitlab",
      itemsProcessed: 0,
      decisionsFound: 0,
      errors: error instanceof Error ? error.message : "GitLab sync failed",
    })
  }

  // Sync Google Meet (Calendar events with Meet links)
  try {
    console.log("[AutoSync] Starting Google Meet sync...")
    const meetResult = await autoSyncGoogleMeet(userId)
    results.push(meetResult)
    console.log(`[AutoSync] Meet sync complete: ${meetResult.itemsProcessed} meetings`)
  } catch (error) {
    console.error("[AutoSync] Meet sync failed:", error)
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
  console.log(`[AutoSync:Slack] Found ${channels.length} channels`)

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

    if (existingDecision) {
      console.log(`[AutoSync:Slack] Skipping #${channel.name} - already analyzed recently`)
      continue
    }

    // Fetch messages
    const messages = await getSlackChannelMessages(userId, channel.id, 100)
    console.log(`[AutoSync:Slack] Channel #${channel.name}: ${messages.length} messages`)
    itemsProcessed += messages.length

    if (messages.length === 0) continue

    // Format conversation
    const conversation = messages
      .filter((msg: any) => msg.type === "message" && msg.text)
      .map((msg: any) => `${msg.user}: ${msg.text}`)
      .join("\n\n")

    if (!conversation.trim()) continue

    // Analyze for decisions
    console.log(`[AutoSync:Slack] Analyzing #${channel.name}...`)
    const detection = await detectDecision(conversation)
    console.log(`[AutoSync:Slack] Detection result: isDecision=${detection.isDecision}, confidence=${detection.confidence}`)

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
      console.log(`[AutoSync:Slack] ✅ Decision saved for #${channel.name}: ${brief.title}`)
      decisionsFound++
    }
  }

  return { source: "slack", itemsProcessed, decisionsFound }
}

/**
 * Auto-sync GitLab issues - only analyze issues with recent activity
 */
async function autoSyncGitLab(userId: string): Promise<SyncResult> {
  let itemsProcessed = 0
  let decisionsFound = 0

  const projects = await getGitLabProjects(userId)
  console.log(`[AutoSync:GitLab] Found ${projects.length} projects`)

  // Only process projects updated in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  for (const project of projects.slice(0, 10)) { // Process up to 10 projects
    const lastActivity = new Date(project.last_activity_at)
    if (lastActivity < sevenDaysAgo) {
      console.log(`[AutoSync:GitLab] Skipping project ${project.name} - no recent activity`)
      continue
    }

    console.log(`[AutoSync:GitLab] Processing project: ${project.name}`)

    // Sync Issues
    try {
      const issues = await getGitLabIssues(userId, project.id, "all")
      console.log(`[AutoSync:GitLab] Project ${project.name}: ${issues.length} issues`)

      // Filter to only issues updated in last 7 days
      const recentIssues = issues.filter((issue: any) => {
        const updatedAt = new Date(issue.updated_at)
        return updatedAt >= sevenDaysAgo
      })

      console.log(`[AutoSync:GitLab] Recent issues (last 7 days): ${recentIssues.length}`)

      for (const issue of recentIssues.slice(0, 10)) { // Process last 10 recent issues
        console.log(`[AutoSync:GitLab] Checking issue #${issue.iid}: ${issue.title}`)

        // Check if already analyzed in last 24 hours
        const existingDecision = await prisma.decision.findFirst({
          where: {
            userId,
            source: "gitlab",
            sourceLink: issue.web_url,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        })

        if (existingDecision) {
          console.log(`[AutoSync:GitLab] Skipping issue #${issue.iid} - already analyzed recently`)
          continue
        }

        // Fetch notes/discussions
        const notes = await getGitLabIssueNotes(userId, project.id, issue.iid)
        itemsProcessed++

        const userNotes = notes.filter((n) => !n.system)
        console.log(`[AutoSync:GitLab] Issue #${issue.iid}: ${userNotes.length} user notes`)

        if (userNotes.length === 0) continue

        // Build conversation with clear timestamps
        let conversation = `Issue Title: ${issue.title}\n`
        conversation += `Issue State: ${issue.state}\n`
        conversation += `Last Updated: ${issue.updated_at}\n\n`

        if (issue.description) {
          conversation += `Description:\n${issue.description}\n\n`
        }

        conversation += "Discussion (in chronological order):\n"
        // Sort notes by created_at to ensure chronological order
        const sortedNotes = userNotes.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        sortedNotes.forEach((note, index) => {
          conversation += `[${index + 1}] ${note.author.name} (${note.created_at}):\n${note.body}\n\n`
        })

        conversation += "\n---\n"
        conversation += "Analyze this conversation and identify the FINAL decision made. "
        conversation += "Pay special attention to the LATEST messages as they represent the current decision."

        console.log(`[AutoSync:GitLab] Analyzing issue #${issue.iid}...`)
        console.log(`[AutoSync:GitLab] Conversation length: ${conversation.length} chars`)

        // Analyze
        const detection = await detectDecision(conversation)
        console.log(`[AutoSync:GitLab] Detection result: isDecision=${detection.isDecision}, confidence=${detection.confidence}`)

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
          console.log(`[AutoSync:GitLab] ✅ Decision saved for issue #${issue.iid}: ${brief.title}`)
          decisionsFound++
        } else {
          console.log(`[AutoSync:GitLab] ❌ No decision detected for issue #${issue.iid}`)
        }
      }
    } catch (error) {
      console.error(`[AutoSync:GitLab] Error processing project ${project.name}:`, error)
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

    console.log(`[AutoSync:Meet] Found ${events.length} meetings in last 7 days`)

    for (const event of events) {
      itemsProcessed++

      // Check if already analyzed (using googleEventId)
      const existingMeeting = await prisma.meeting.findFirst({
        where: {
          userId,
          googleEventId: event.id,
        },
      })

      if (existingMeeting) {
        console.log(`[AutoSync:Meet] Skipping meeting ${event.summary} - already processed`)
        continue
      }

      // Note: To get actual transcripts, you would need:
      // 1. Google Workspace Enterprise license
      // 2. Access to Google Meet Recording API
      // 3. Process the transcript with AI

      console.log(`[AutoSync:Meet] Found meeting: ${event.summary} (${event.id})`)
    }

    console.log(`[AutoSync:Meet] Processed ${itemsProcessed} meetings`)

  } catch (error) {
    console.error("[AutoSync:Meet] Google Meet sync error:", error)
    throw error
  }

  return { source: "meet", itemsProcessed, decisionsFound }
}

/**
 * Sync embeddings for all unsynced decisions to Weaviate
 */
export async function syncEmbeddingsToWeaviate(userId: string): Promise<{
  synced: number
  failed: number
}> {
  console.log(`[EmbeddingSync] Starting embedding sync for user: ${userId}`)
  
  let synced = 0
  let failed = 0

  // Ensure Weaviate schema exists
  const schemaReady = await ensureDecisionSchema()
  if (!schemaReady) {
    console.error('[EmbeddingSync] Failed to ensure Weaviate schema')
    return { synced: 0, failed: 0 }
  }

  // Get unsynced decisions
  const unsyncedDecisions = await prisma.decision.findMany({
    where: {
      userId,
      embeddingSynced: false,
    },
    take: 50, // Process in batches
  })

  console.log(`[EmbeddingSync] Found ${unsyncedDecisions.length} unsynced decisions`)

  for (const decision of unsyncedDecisions) {
    try {
      const success = await addDecisionToWeaviate({
        id: decision.id,
        userId: decision.userId,
        title: decision.title,
        summary: decision.summary,
        problemStatement: decision.problemStatement,
        optionsDiscussed: decision.optionsDiscussed,
        finalDecision: decision.finalDecision,
        rationale: decision.rationale,
        actionItems: decision.actionItems,
        source: decision.source,
        sourceLink: decision.sourceLink || undefined,
        timestamp: decision.timestamp,
      })

      if (success) {
        // Mark as synced in database
        await prisma.decision.update({
          where: { id: decision.id },
          data: { embeddingSynced: true },
        })
        synced++
        console.log(`[EmbeddingSync] ✅ Synced decision: ${decision.title}`)
      } else {
        failed++
        console.error(`[EmbeddingSync] ❌ Failed to sync decision: ${decision.title}`)
      }
    } catch (error) {
      failed++
      console.error(`[EmbeddingSync] Error syncing decision ${decision.id}:`, error)
    }
  }

  console.log(`[EmbeddingSync] Complete: ${synced} synced, ${failed} failed`)
  return { synced, failed }
}
