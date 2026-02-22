import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format, subDays, startOfWeek, endOfWeek } from "date-fns"
import { CheckCircle, Users, Zap, Video, FileText, MessageSquare, GitBranch, TrendingUp, BarChart3, Activity, Clock } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const userId = session.user.id

  // Fetch all data in parallel
  const [
    meetingCount,
    decisionCount,
    recentDecisions,
    slackIntegration,
    gitlabIntegration,
    decisionsLast7Days,
    decisionsLast30Days,
    decisionsBySource,
    avgConfidence,
    webhookStats,
    userRatings
  ] = await Promise.all([
    // Basic counts
    prisma.meeting.count({ where: { userId } }),
    prisma.decision.count({ where: { userId } }),
    
    // Recent decisions
    prisma.decision.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { meeting: { select: { title: true, startTime: true } } }
    }),
    
    // Integrations
    prisma.slackIntegration.findUnique({ where: { userId } }),
    prisma.gitLabIntegration.findUnique({ where: { userId } }),
    
    // Decisions in last 7 days
    prisma.decision.count({
      where: { userId, createdAt: { gte: subDays(new Date(), 7) } }
    }),
    
    // Decisions in last 30 days
    prisma.decision.count({
      where: { userId, createdAt: { gte: subDays(new Date(), 30) } }
    }),
    
    // Decisions by source
    prisma.decision.groupBy({
      by: ['source'],
      where: { userId },
      _count: true
    }),
    
    // Average confidence
    prisma.decision.aggregate({
      where: { userId },
      _avg: { confidence: true }
    }),
    
    // Webhook stats
    prisma.webhookLog.groupBy({
      by: ['status'],
      where: { userId },
      _count: true
    }),
    
    // User ratings distribution
    prisma.decision.groupBy({
      by: ['userRating'],
      where: { userId, userRating: { not: null } },
      _count: true
    })
  ])

  // Calculate growth metrics
  const growthPercent = decisionsLast30Days > 0 
    ? Math.round(((decisionsLast7Days / decisionsLast30Days) * 100))
    : 0

  // Format decisions by source for display
  const sourceData = decisionsBySource.map(d => ({
    source: d.source,
    count: d._count
  }))

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

      {/* Stats Row with Blue Accents */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-100 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Decisions</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{decisionCount}</div>
            <p className="text-xs text-blue-600/70">Decisions captured</p>
          </CardContent>
        </Card>

        <Card className="border-green-100 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Meetings</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{meetingCount}</div>
            <p className="text-xs text-green-600/70">Connected</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 dark:border-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">AI Confidence</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {avgConfidence._avg.confidence 
                ? `${Math.round(avgConfidence._avg.confidence * 100)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-purple-600/70">Average detection</p>
          </CardContent>
        </Card>

        <Card className="border-orange-100 dark:border-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{decisionsLast7Days}</div>
            <p className="text-xs text-orange-600/70">+{growthPercent}% vs last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Decisions by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Decisions by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet</p>
            ) : (
              <div className="space-y-3">
                {sourceData.map((item) => (
                  <div key={item.source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.source === 'meet' && <Video className="h-4 w-4 text-green-600" />}
                      {item.source === 'slack' && <MessageSquare className="h-4 w-4 text-purple-600" />}
                      {item.source === 'gitlab' && <GitBranch className="h-4 w-4 text-orange-600" />}
                      {item.source === 'manual' && <FileText className="h-4 w-4 text-blue-600" />}
                      <span className="text-sm capitalize">{item.source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(item.count / decisionCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Webhook Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {webhookStats.length === 0 ? (
              <p className="text-sm text-zinc-500">No webhook activity</p>
            ) : (
              <div className="space-y-3">
                {webhookStats.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{stat.status}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      stat.status === 'processed' ? 'bg-green-100 text-green-700' :
                      stat.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {stat._count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Quality Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userRatings.length === 0 ? (
              <p className="text-sm text-zinc-500">No ratings yet</p>
            ) : (
              <div className="space-y-3">
                {userRatings.map((rating) => (
                  <div key={rating.userRating} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((star) => (
                        <span key={star} className={star <= (rating.userRating || 0) ? "text-yellow-500" : "text-zinc-300"}>★</span>
                      ))}
                    </div>
                    <span className="text-sm font-medium">{rating._count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links with Colored Icons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/meetings">
          <Card className="hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full border-2 border-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meetings</CardTitle>
              <Video className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetingCount}</div>
              <p className="text-xs text-zinc-500">Connected</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/decisions">
          <Card className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full border-2 border-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Decisions</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{decisionCount}</div>
              <p className="text-xs text-zinc-500">Captured</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/slack">
          <Card className="hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full border-2 border-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slack</CardTitle>
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {slackIntegration ? "Connected" : "Not Connected"}
              </div>
              <p className="text-xs text-zinc-500">
                {slackIntegration ? "View channels" : "Connect workspace"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/gitlab">
          <Card className="hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer h-full border-2 border-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GitLab</CardTitle>
              <GitBranch className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gitlabIntegration ? "Connected" : "Not Connected"}
              </div>
              <p className="text-xs text-zinc-500">
                {gitlabIntegration ? "View projects" : "Connect account"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Quick Actions</CardTitle>
            <CardDescription>Get started with KnowWhy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/meetings">
              <Button className="w-full justify-start hover:bg-green-50 hover:text-green-700 hover:border-green-300" variant="outline">
                <Video className="mr-2 h-4 w-4 text-green-600" />
                Connect Google Meet
              </Button>
            </Link>
            <Link href="/slack">
              <Button className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4 text-purple-600" />
                Browse Slack Channels
              </Button>
            </Link>
            <Link href="/gitlab">
              <Button className="w-full justify-start hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300" variant="outline">
                <GitBranch className="mr-2 h-4 w-4 text-orange-600" />
                Browse GitLab Projects
              </Button>
            </Link>
            <Link href="/decisions">
              <Button className="w-full justify-start hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300" variant="outline">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                View Decisions
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Recent Activity</CardTitle>
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
                {recentDecisions.map((decision: { id: string; title: string; meeting?: { title: string }; createdAt: Date; confidence: number }) => (
                  <div key={decision.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-medium truncate text-blue-900 dark:text-blue-100">{decision.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-zinc-500">
                        {decision.meeting?.title || "Manual entry"}
                      </p>
                      <span className="text-xs text-zinc-400">•</span>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(decision.createdAt), "MMM d")}
                      </p>
                      <span className="text-xs text-zinc-400">•</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        decision.confidence >= 0.8
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : decision.confidence >= 0.6
                            ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
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