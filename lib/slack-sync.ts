import { prisma } from "./prisma"
import { getSlackChannels, getSlackChannelMessages } from "./slack"
import { detectDecision, generateDecisionBrief } from "./groq"

interface SyncResult {
  channelId: string
  channelName: string
  messagesProcessed: number
  decisionsFound: number
  errors?: string
}

export async function autoSyncSlackChannels(userId: string): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  try {
    // Fetch all channels
    const channels = await getSlackChannels(userId)

    for (const channel of channels) {
      try {
        // Skip channels with very few members (likely archived/noisy)
        if (channel.num_members < 2) continue

        // Fetch recent messages
        const messages = await getSlackChannelMessages(userId, channel.id, 100)

        if (!messages || messages.length === 0) {
          results.push({
            channelId: channel.id,
            channelName: channel.name,
            messagesProcessed: 0,
            decisionsFound: 0,
          })
          continue
        }

        // Format messages as conversation
        const conversation = messages
          .filter((msg: any) => msg.type === "message" && msg.text)
          .map((msg: any) => `${msg.user}: ${msg.text}`)
          .join("\n\n")

        if (!conversation.trim()) {
          results.push({
            channelId: channel.id,
            channelName: channel.name,
            messagesProcessed: messages.length,
            decisionsFound: 0,
          })
          continue
        }

        // Check if we already analyzed this conversation recently
        const lastMessageTs = messages[0]?.ts
        const existingDecision = await prisma.decision.findFirst({
          where: {
            userId,
            source: "slack",
            sourceLink: { contains: channel.id },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        })

        // Skip if already analyzed recently
        if (existingDecision) {
          results.push({
            channelId: channel.id,
            channelName: channel.name,
            messagesProcessed: messages.length,
            decisionsFound: 0,
          })
          continue
        }

        // Detect decision
        const detection = await detectDecision(conversation)

        if (!detection.isDecision || detection.confidence < 0.6) {
          results.push({
            channelId: channel.id,
            channelName: channel.name,
            messagesProcessed: messages.length,
            decisionsFound: 0,
          })
          continue
        }

        // Generate decision brief
        const brief = await generateDecisionBrief(conversation, `Slack: #${channel.name}`)

        // Save decision
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

        results.push({
          channelId: channel.id,
          channelName: channel.name,
          messagesProcessed: messages.length,
          decisionsFound: 1,
        })
      } catch (error) {
        results.push({
          channelId: channel.id,
          channelName: channel.name,
          messagesProcessed: 0,
          decisionsFound: 0,
          errors: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return results
  } catch (error) {
    console.error("Auto-sync failed:", error)
    throw error
  }
}