/**
 * Append-only audit log.
 *
 * Every security-relevant user action is written to the `audit_logs` table.
 * The API layer never exposes an update or delete endpoint for this table,
 * making it effectively immutable from the application's perspective.
 */
import { prisma } from "./prisma"

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "INTEGRATION_CONNECTED"
  | "INTEGRATION_DISCONNECTED"
  | "DECISION_DELETED"
  | "DECISION_EXPORTED"
  | "SETTINGS_CHANGED"
  | "TOKEN_ROTATED"
  | "WEBHOOK_SIGNATURE_FAILED"
  | "RATE_LIMIT_HIT"
  | "ACCOUNT_DELETED"

/**
 * Write a single audit event. Fire-and-forget — failures are logged to console
 * but never propagate to the caller so they can't break the primary request.
 */
export async function createAuditLog(
  userId: string,
  action: AuditAction,
  metadata: Record<string, unknown> = {},
  request?: Request
): Promise<void> {
  try {
    const ipAddress = extractIp(request)
    await (prisma as any).auditLog.create({
      data: {
        userId,
        action,
        metadata,
        ipAddress,
      },
    })
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err)
  }
}

function extractIp(request?: Request): string | null {
  if (!request) return null
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    null
  )
}
