/**
 * Environment variable validation — called once at startup.
 * Any missing required variable causes a fast, descriptive crash instead of a
 * silent runtime failure deep in the stack.
 */
import { z } from "zod"

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Encryption — 32-byte (64-char hex) key, required so tokens are never stored plain
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"),

  // AI
  AI_PROVIDER: z.enum(["groq", "ollama"]).default("ollama"),
  GROQ_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("mxbai-embed-large"),
  OLLAMA_CHAT_MODEL: z.string().default("llama3.2"),

  // Slack (optional integration)
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_OAUTH_REDIRECT_URI: z.string().url().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),

  // GitLab (optional integration)
  GITLAB_WEBHOOK_SECRET: z.string().optional(),

  // Weaviate
  WEAVIATE_URL: z.string().url().default("http://localhost:8080"),
  WEAVIATE_API_KEY: z.string().optional(), // Required in production; optional for local dev

  // Cron
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),

  // Data retention
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues ?? (result.error as any).errors ?? []
    const errors = issues
      .map((e: any) => `  \u2022 ${e.path.join(".")}: ${e.message}`)
      .join("\n")
    throw new Error(`\n\u274c Invalid environment variables:\n${errors}\n`)
  }

  return result.data
}

// Validate once and export. Importing this module in any server file ensures
// validation runs before any code that relies on the env.
export const env = validateEnv()
