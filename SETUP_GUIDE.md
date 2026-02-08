# KnowWhy - Complete Setup Guide

This guide will help you set up the KnowWhy project on a new machine from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone & Install](#clone--install)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Slack Integration Setup](#slack-integration-setup)
6. [Google Calendar Setup](#google-calendar-setup)
7. [GitLab Integration Setup](#gitlab-integration-setup)
8. [Running the Application](#running-the-application)
9. [Automatic Slack Sync Setup](#automatic-slack-sync-setup)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

```bash
# Install Node.js (v18 or higher)
# Download from: https://nodejs.org/

# Install Git
# Download from: https://git-scm.com/

# Install PostgreSQL
# Download from: https://www.postgresql.org/download/
# Or use Docker (recommended)
```

### Verify Installations

```bash
node --version      # Should show v18+
npm --version       # Should show 9+
git --version       # Should show 2.x
```

---

## Clone & Install

### 1. Clone the Repository

```bash
# Clone the repository
git clone <your-repo-url>

# Navigate to project
cd knowwhy

# Install dependencies
npm install
```

### 2. Install Additional Dependencies

```bash
# Install shadcn/ui components (if needed)
npx shadcn add card button input badge tabs separator

# Install other required packages
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npm install next-auth@beta @auth/prisma-adapter
npm install @prisma/client prisma
npm install groq-sdk
npm install date-fns
npm install sonner
```

---

## Database Setup

### Option 1: Using Docker (Recommended)

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Or use this docker command directly:
docker run -d \
  --name knowwhy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=Des!gner18 \
  -e POSTGRES_DB=knowwhynew \
  -p 5432:5432 \
  postgres:15-alpine
```

### Option 2: Using Local PostgreSQL

```bash
# Create database manually
createdb -U postgres knowwhynew

# Or using psql
psql -U postgres -c "CREATE DATABASE knowwhynew;"
```

### Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Or deploy migrations (for production)
npx prisma migrate deploy
```

### Seed Database (Optional)

```bash
# If you have seed data
npx prisma db seed
```

---

## Environment Variables

### 1. Create Environment File

```bash
# Copy example file
cp .env.example .env.local
```

### 2. Configure Variables

Edit `.env.local` with your values:

```env
# Database
DATABASE_URL="postgresql://postgres:Des!gner18@localhost:5432/knowwhynew"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars-long"

# Generate a secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Google OAuth (for Google Calendar/Meet)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
# Get from: https://console.cloud.google.com/apis/credentials

# Groq API (for AI decision detection)
GROQ_API_KEY="gsk_your_groq_api_key"
# Get from: https://console.groq.com/

# Slack Integration
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_OAUTH_REDIRECT_URI="http://localhost:3000/api/integrations/slack/callback"
# Get from: https://api.slack.com/apps

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
ENCRYPTION_KEY="your-encryption-key"
```

---

## Slack Integration Setup

### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: `KnowWhy`
4. Select your workspace
5. Click "Create App"

### 2. Configure OAuth & Permissions

Navigate to **OAuth & Permissions**:

#### Redirect URLs:
```
# For local development:
http://localhost:3000/api/integrations/slack/callback

# For production:
https://your-domain.com/api/integrations/slack/callback
```

#### Bot Token Scopes (REQUIRED):
```
channels:history      # Read public channel messages
channels:read         # List channels
groups:history        # Read private channel messages
users:read            # Read user information
channels:join         # Optional: Auto-join channels
```

Add scopes under **Bot Token Scopes**, then click **Save Changes**.

### 3. Install App to Workspace

1. Scroll to top of **OAuth & Permissions**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 4. Get Credentials

Navigate to **Basic Information** → **App Credentials**:
- Copy **Client ID**
- Copy **Client Secret** (click "Show")
- Add to `.env.local`

### 5. Invite Bot to Channels

In Slack, go to each channel and type:
```
/invite @KnowWhy
```

(Replace `@KnowWhy` with your bot's name)

---

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable APIs:
   - Google Calendar API
   - Google Meet API

### 2. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Name: `KnowWhy`
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-domain.com/api/auth/callback/google
   ```
6. Click **Create**
7. Copy **Client ID** and **Client Secret** to `.env.local`

### 3. Configure Consent Screen

1. Go to **OAuth consent screen**
2. User Type: **External** (or Internal for Google Workspace)
3. Fill in app name, user support email, developer contact
4. Add scopes:
   - `.../auth/calendar`
   - `.../auth/calendar.events`
   - `openid`, `email`, `profile`
5. Add test users (for external apps)

---

## GitLab Integration Setup

### 1. Get Personal Access Token

1. Go to GitLab → **User Settings** → **Access Tokens**
2. Create new token:
   - Name: `KnowWhy Integration`
   - Expiration: (your choice)
   - Scopes: `read_api`, `read_repository`
3. Copy the token

### 2. Configure in KnowWhy

Go to **Settings** page in KnowWhy:
1. Enter GitLab URL (e.g., `https://gitlab.com` or your self-hosted URL)
2. Paste the Personal Access Token
3. Click **Connect GitLab**

---

## Running the Application

### Development Mode

```bash
# Start development server
npm run dev

# Or with Turbopack (faster)
npm run dev -- --turbo
```

Access at: http://localhost:3000

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Using Cloudflare Tunnel (for HTTPS/Slack testing)

```bash
# Install cloudflared (one-time)
npm install -g cloudflared

# Start tunnel
npx cloudflared tunnel --url http://localhost:3000

# Copy the HTTPS URL and update:
# - .env.local: NEXTAUTH_URL and SLACK_OAUTH_REDIRECT_URI
# - Slack App: Redirect URLs
```

---

## Automatic Slack Sync Setup

### Option 1: GitHub Actions (Recommended)

Already configured in `.github/workflows/slack-sync.yml`.

Set repository secrets:
- `APP_URL`: Your app URL (e.g., `https://knowwhy.vercel.app`)
- `API_SECRET`: (optional) Additional security

### Option 2: Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/slack/auto-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Option 3: External Cron Service

Use EasyCron, Cron-job.org, etc.:
- URL: `https://your-domain.com/api/slack/auto-sync`
- Method: `POST`
- Schedule: Every hour (`0 * * * *`)

### Option 4: Server Cron

```bash
# Edit crontab
crontab -e

# Add line:
0 * * * * curl -X POST http://localhost:3000/api/slack/auto-sync
```

### Test Auto-Sync

```bash
# Manual trigger
curl -X POST http://localhost:3000/api/slack/auto-sync
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Reset database (WARNING: loses data)
npx prisma migrate reset
```

### Slack "not_in_channel" Error

Bot needs to be invited to channel:
```
/invite @KnowWhy
```

### Slack "missing_scope" Error

Add missing scope in Slack App → OAuth & Permissions → Bot Token Scopes, then reinstall app.

### Next.js Build Errors

```bash
# Clear cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Environment Variables Not Loading

```bash
# Ensure .env.local exists
cat .env.local

# Restart dev server after changes
```

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- --port 3001
```

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Database
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open database UI
npx prisma db push       # Push schema changes

# Git
git status               # Check status
git log --oneline -5     # View recent commits

# Testing
npx tsx scripts/setup-auto-sync.ts  # Setup auto-sync
```

---

## Project Structure

```
knowwhy/
├── app/                    # Next.js app directory
│   ├── (authenticated)/    # Protected routes
│   ├── api/                # API routes
│   └── login/              # Login page
├── components/             # React components
│   └── ui/                 # shadcn/ui components
├── lib/                    # Utility functions
│   ├── slack.ts           # Slack API
│   ├── slack-sync.ts      # Auto-sync service
│   ├── gitlab.ts          # GitLab API
│   ├── groq.ts            # AI analysis
│   └── prisma.ts          # Database client
├── prisma/
│   └── schema.prisma      # Database schema
├── scripts/               # Setup scripts
├── .env.local            # Environment variables
├── .env.example          # Example env file
└── README.md             # Project readme
```

---

## Support

- **Slack API Docs**: https://api.slack.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Groq API Docs**: https://console.groq.com/docs

---

**Last Updated**: February 7, 2026
