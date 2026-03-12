/**
 * RBAC helpers.
 *
 * Usage in a Route Handler:
 *   const session = await auth()
 *   const check = requireRole(session, "ADMIN")
 *   if (check) return check          // returns 401/403 NextResponse when not authorised
 *   // ...proceed with admin logic
 */
import { NextResponse } from "next/server"
import { Session } from "next-auth"

type Role = "USER" | "ADMIN"

/**
 * Checks that the session exists and the user holds at least `role`.
 * Returns a NextResponse error when the check fails, or `null` when it passes.
 *
 * Role hierarchy: ADMIN > USER
 */
export function requireRole(
  session: Session | null,
  role: Role
): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userRole: Role = (session.user as { role?: Role }).role ?? "USER"

  if (role === "ADMIN" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

/**
 * Shorthand: requires any authenticated user.
 */
export function requireAuth(session: Session | null): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
