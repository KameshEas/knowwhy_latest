import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return null
  }

  // Fetch actual counts from database
  const [meetingCount, decisionCount, recentDecisions] = await Promise.all([
    prisma.meeting.count({
      where: { userId: session.user.id }
    }),
    prisma.decision.count({
      where: { userId: session.user.id }
    }),
    prisma.decision.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        meeting: {
          select: {
            title: true,
            startTime: true,
          }
        }
      }
    })
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Here's what's happening with your decisions and meetings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
            <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decisionCount}</div>
            <p className="text-xs text-zinc-500">Decisions captured so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetingCount}</div>
            <p className="text-xs text-zinc-500">Meetings connected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentDecisions.length > 0 
                ? `${Math.round(recentDecisions.reduce((acc, d) => acc + (d.confidence * 100), 0) / recentDecisions.length)}%`
                : "N/A"
              }
            </div>
            <p className="text-xs text-zinc-500">Average detection confidence</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with KnowWhy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/meetings">
              <Button className="w-full justify-start" variant="outline">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Connect Google Meet
              </Button>
            </Link>
            <Link href="/decisions">
              <Button className="w-full justify-start" variant="outline">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Decisions
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest captured decisions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDecisions.length === 0 ? (
              <div className="text-sm text-zinc-500 text-center py-8">
                No decisions captured yet.
                <br />
                Connect your meetings to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {recentDecisions.map((decision) => (
                  <div key={decision.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-medium truncate">{decision.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-zinc-500">
                        {decision.meeting?.title || "Manual entry"}
                      </p>
                      <span className="text-xs text-zinc-400">•</span>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(decision.createdAt), "MMM d")}
                      </p>
                      <span className="text-xs text-zinc-400">•</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        decision.confidence >= 0.8
                          ? "bg-green-100 text-green-700"
                          : decision.confidence >= 0.6
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {Math.round(decision.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}