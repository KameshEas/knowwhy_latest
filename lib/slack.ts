import { prisma } from "./prisma"

interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  num_members: number
  created: number
  topic?: { value: string }
  purpose?: { value: string }
}

export async function getSlackChannels(userId: string): Promise<SlackChannel[]> {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("Slack not connected")
  }

  const response = await fetch("https://slack.com/api/conversations.list", {
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
    },
  })

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.error || "Failed to fetch channels")
  }

  return data.channels || []
}

export async function getSlackChannelMessages(
  userId: string,
  channelId: string,
  limit: number = 100
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("Slack not connected")
  }

  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
    }
  )

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.error || "Failed to fetch messages")
  }

  return data.messages || []
}
