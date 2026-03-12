/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function AdminAuditLogsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userRole = (session.user as { role?: string }).role ?? "USER"
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  // Server-side: fetch first page of all audit logs across all users
  const PAGE_SIZE = 50
  const logs = await (prisma as any).auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      userId: true,
      action: true,
      metadata: true,
      ipAddress: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  })

  const total = await (prisma as any).auditLog.count()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin — Audit Logs</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Immutable security event log across all users. {total.toLocaleString()} total entries.
          Showing most recent {PAGE_SIZE}.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">User</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">Action</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">Details</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">IP Address</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-xs">{log.user?.name ?? "—"}</div>
                    <div className="text-zinc-500 text-xs">{log.user?.email ?? log.userId}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === "LOGIN" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                      log.action === "ACCOUNT_DELETED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                      log.action.includes("FAILED") || log.action === "RATE_LIMIT_HIT" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                      log.action.includes("DELETED") || log.action.includes("DISCONNECTED") ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-[260px] truncate text-xs">
                    {Object.entries(log.metadata ?? {}).map(([k, v]: [string, any]) => `${k}: ${v}`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    {log.ipAddress ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
            Showing {PAGE_SIZE} of {total.toLocaleString()} entries. Use the{" "}
            <code className="text-xs">GET /api/user/audit-logs?userId=&lt;id&gt;</code> endpoint
            to paginate the full log.
          </div>
        )}
      </div>
    </div>
  )
}
