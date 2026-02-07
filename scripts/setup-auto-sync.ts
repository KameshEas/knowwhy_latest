#!/usr/bin/env tsx
/**
 * Setup script for automatic Slack sync
 * 
 * This script sets up a cron job to automatically sync Slack messages
 * and detect decisions every hour.
 * 
 * Usage:
 *   npx tsx scripts/setup-auto-sync.ts
 * 
 * Or manually add to crontab:
 *   0 * * * * curl -X POST https://your-domain.com/api/slack/auto-sync -H "Authorization: Bearer YOUR_API_TOKEN"
 */

import { prisma } from "../lib/prisma"

async function setupAutoSync() {
  console.log("🔧 Setting up automatic Slack sync...\n")

  // Get all users with Slack connected
  const slackUsers = await prisma.slackIntegration.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  console.log(`Found ${slackUsers.length} users with Slack connected\n`)

  for (const integration of slackUsers) {
    console.log(`✓ User: ${integration.user.name} (${integration.user.email})`)
    console.log(`  Workspace: ${integration.workspaceName || "Unknown"}`)
    console.log(`  Connected: ${integration.createdAt.toLocaleDateString()}\n`)
  }

  console.log("\n📋 To enable automatic sync, choose one option:\n")
  
  console.log("Option 1: Vercel Cron (Recommended for Vercel deployments)")
  console.log("  - Add to vercel.json:\n")
  console.log(`  {
    "crons": [
      {
        "path": "/api/slack/auto-sync",
        "schedule": "0 * * * *"
      }
    ]
  }\n`)
  
  console.log("Option 2: External Cron Service (EasyCron, Cron-job.org)")
  console.log("  - URL: https://your-domain.com/api/slack/auto-sync")
  console.log("  - Method: POST")
  console.log("  - Schedule: Every hour (0 * * * *)\n")
  
  console.log("Option 3: Local/Server Cron")
  console.log("  - Add to crontab:")
  console.log(`  0 * * * * curl -X POST http://localhost:3000/api/slack/auto-sync\n`)
  
  console.log("Option 4: GitHub Actions")
  console.log("  - See .github/workflows/slack-sync.yml template\n")
  
  console.log("✅ Setup complete! Choose an option above to enable auto-sync.")
}

setupAutoSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect())