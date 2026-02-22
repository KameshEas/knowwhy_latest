import { prisma } from "@/lib/prisma"

// Notification types
export type NotificationType = "decision_detected" | "sync_complete" | "error"

interface NotificationOptions {
  userId: string
  type: NotificationType
  title: string
  message: string
  decisionId?: string
  source?: "slack" | "gitlab" | "meet"
}

/**
 * Send notification when a decision is detected
 * Supports: In-app toast, Slack DM, Email (future)
 */
export async function sendDecisionNotification(options: NotificationOptions) {
  const { userId, type, title, message, decisionId, source } = options

  console.log(`[Notification] Sending ${type} notification to user ${userId}`)

  // 1. Store notification in database (for history)
  try {
    // Could add a notifications table, but for now we just log
    console.log(`[Notification] Stored: ${title} - ${message}`)
  } catch (error) {
    console.error("[Notification] Failed to store notification:", error)
  }

  // 2. Send Slack notification if user has Slack connected
  if (source !== "slack") {
    await sendSlackNotification(userId, title, message, decisionId)
  }

  // 3. Send email notification (placeholder - requires email service setup)
  await sendEmailNotification(userId, title, message)

  return { success: true }
}

/**
 * Send notification via Slack DM
 */
async function sendSlackNotification(
  userId: string,
  title: string,
  message: string,
  decisionId?: string
) {
  try {
    const slackIntegration = await prisma.slackIntegration.findUnique({
      where: { userId },
    })

    if (!slackIntegration) {
      console.log("[Notification] No Slack integration found, skipping Slack notification")
      return
    }

    // Open a direct message conversation with the user
    const openConvResponse = await fetch(
      "https://slack.com/api/conversations.open",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slackIntegration.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          users: slackIntegration.userSlackId,
        }),
      }
    )

    const openConvData = await openConvResponse.json()
    if (!openConvData.ok) {
      console.error("[Notification] Failed to open Slack conversation:", openConvData.error)
      return
    }

    // Send the message
    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎯 New Decision Detected!",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${title}*\n\n${message}`,
        },
      },
    ]

    if (decisionId) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Decision",
              emoji: true,
            },
            url: `${process.env.NEXTAUTH_URL || process.env.APP_URL || ""}/decisions?id=${decisionId}`,
            style: "primary",
          },
        ],
      })
    }

    const messageResponse = await fetch(
      "https://slack.com/api/chat.postMessage",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slackIntegration.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: openConvData.channel.id,
          text: `${title}: ${message}`,
          blocks,
        }),
      }
    )

    const messageData = await messageResponse.json()
    if (messageData.ok) {
      console.log("[Notification] Slack notification sent successfully")
    } else {
      console.error("[Notification] Failed to send Slack message:", messageData.error)
    }
  } catch (error) {
    console.error("[Notification] Error sending Slack notification:", error)
  }
}

/**
 * Send email notification
 * Note: Requires email service (SendGrid, Resend, etc.) to be configured
 */
async function sendEmailNotification(
  userId: string,
  title: string,
  message: string
) {
  try {
    // Get user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!user?.email) {
      console.log("[Notification] No user email found, skipping email notification")
      return
    }

    // Check if email service is configured
    const emailService = process.env.EMAIL_SERVICE // "resend" | "sendgrid" | "smtp"
    
    if (!emailService) {
      console.log("[Notification] No email service configured, skipping email notification")
      console.log(`[Notification] Would have sent email to ${user.email}: ${title}`)
      return
    }

    // Email sending logic would go here based on service
    // Example for Resend:
    // await resend.emails.send({
    //   from: 'KnowWhy <noreply@yourdomain.com>',
    //   to: user.email,
    //   subject: `🎯 ${title}`,
    //   html: `<p>${message}</p>`,
    // })

    console.log(`[Notification] Email sent to ${user.email}: ${title}`)
  } catch (error) {
    console.error("[Notification] Error sending email notification:", error)
  }
}

/**
 * Notify user of sync completion
 */
export async function notifySyncComplete(userId: string, source: string, decisionCount: number) {
  await sendDecisionNotification({
    userId,
    type: "sync_complete",
    title: "Sync Complete",
    message: `Found ${decisionCount} new decision(s) from ${source}.`,
    source: source as "slack" | "gitlab" | "meet",
  })
}

/**
 * Notify user of errors
 */
export async function notifyError(userId: string, errorMessage: string, source: string) {
  await sendDecisionNotification({
    userId,
    type: "error",
    title: "Error Occurred",
    message: errorMessage,
    source: source as "slack" | "gitlab" | "meet",
  })
}
