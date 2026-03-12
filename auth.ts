import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"
import { createAuditLog } from "./lib/audit"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request only identity scopes at login.
          // Calendar scopes are requested incrementally from the Settings page
          // to enforce data minimization — users who never use Calendar never grant access.
          scope: ["openid", "email", "profile"].join(" "),
          // Only request offline access when a refresh token is actually needed.
          // Remove `prompt: "consent"` so returning users aren’t re-prompted every login.
          access_type: "online",
          response_type: "code",
        },
      },
      // Do NOT set allowDangerousEmailAccountLinking — it enables account
      // takeover when other providers are added later.
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async signIn({ user }) {
      // Audit sign-in events (fire-and-forget, never blocks login)
      if (user?.id) {
        createAuditLog(user.id, "LOGIN", { provider: "google" }).catch(() => null)
      }
      return true
    },
  },
  events: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signOut(message: any) {
      const userId =
        message?.session?.userId ??
        message?.session?.user?.id ??
        message?.token?.id
      if (userId) {
        createAuditLog(userId, "LOGOUT", {}).catch(() => null)
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
})