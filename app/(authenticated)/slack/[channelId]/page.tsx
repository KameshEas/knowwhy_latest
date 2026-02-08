"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  MessageSquare, 
  ArrowLeft, 
  RefreshCw,
  Brain,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  Calendar
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { SkeletonMessage } from "@/components/skeleton-card"
import { EmptyState } from "@/components/empty-state"

interface SlackMessage {
  ts: string
  text: string
  user: string
  type: string
  subtype?: string
  threadTs?: string
  replyCount?: number
  timestamp: string
}

interface AnalysisResult {
  success: boolean
  decision?: {
    id: string
    title: string
    summary: string
    confidence: number
  }
  detected?: boolean
  confidence?: number
  message?: string
}

interface ExistingDecision {
  id: string
  title: string
  summary: string
  confidence: number
  createdAt: string
  isRecent: boolean
}

export default function SlackChannelDetailPage() {
  const params = useParams()
  const channelId = params.channelId as string
  
  const [messages, setMessages] = useState<SlackMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [existingDecision, setExistingDecision] = useState<ExistingDecision | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  const fetchMessages = async () => {
    setLoading(true)
    setAnalysisResult(null)
    try {
      const response = await fetch(`/api/slack/channels/${channelId}/messages?limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.messages)
      } else {
        toast.error(data.error || "Failed to fetch messages")
      }
    } catch (error) {
      toast.error("Failed to fetch messages")
    } finally {
      setLoading(false)
    }
  }

  const checkExistingDecision = async () => {
    setCheckingExisting(true)
    try {
      const response = await fetch(`/api/decisions?source=slack`)
      const data = await response.json()
      
      if (data.success && data.decisions) {
        // Find decision for this channel
        const channelDecision = data.decisions.find((d: any) => 
          d.sourceLink?.includes(channelId)
        )
        
        if (channelDecision) {
          const decisionDate = new Date(channelDecision.createdAt)
          const hoursSince = (Date.now() - decisionDate.getTime()) / (1000 * 60 * 60)
          
          setExistingDecision({
            id: channelDecision.id,
            title: channelDecision.title,
            summary: channelDecision.summary,
            confidence: channelDecision.confidence,
            createdAt: channelDecision.createdAt,
            isRecent: hoursSince < 24
          })
        }
      }
    } catch (error) {
      console.error("Failed to check existing decision:", error)
    } finally {
      setCheckingExisting(false)
    }
  }

  const analyzeMessages = async () => {
    // Don't analyze if already recent
    if (existingDecision?.isRecent) {
      toast.info("This channel was already analyzed recently. Check the decisions page.")
      return
    }

    setAnalyzing(true)
    setAnalysisResult(null)
    setAnalysisProgress(0)
    
    // Simulate progress for better UX (AI analysis takes time)
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 800)
    
    try {
      const response = await fetch(`/api/slack/channels/${channelId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      })
      
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      
      const data = await response.json()
      
      if (data.success) {
        setAnalysisResult(data)
        if (data.detected) {
          toast.success(`🎉 Decision detected! "${data.decision?.title}"`)
          // Refresh existing decision check
          await checkExistingDecision()
        } else {
          toast.info(data.message || "No decisions detected in this conversation")
        }
      } else {
        toast.error(data.error || "Analysis failed")
      }
    } catch (error) {
      clearInterval(progressInterval)
      toast.error("Failed to analyze messages")
    } finally {
      setTimeout(() => {
        setAnalyzing(false)
        setAnalysisProgress(0)
      }, 500)
    }
  }

  useEffect(() => {
    if (channelId) {
      fetchMessages()
      checkExistingDecision()
    }
  }, [channelId])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHrs = Math.round(diffMs / (1000 * 60 * 60))
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffHrs < 1) return "just now"
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/slack">
            <Button variant="outline" size="icon" className="hover:bg-purple-50 hover:border-purple-300">
              <ArrowLeft className="h-4 w-4 text-purple-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-100">Channel Messages</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              View and analyze Slack messages for decisions.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMessages}
            disabled={loading || analyzing}
            className="hover:bg-purple-50 hover:border-purple-300"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-purple-600" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4 text-purple-600" />
            )}
            Refresh
          </Button>
          <Button
            onClick={analyzeMessages}
            disabled={analyzing || messages.length === 0 || loading || existingDecision?.isRecent}
            className={existingDecision?.isRecent 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "bg-purple-600 hover:bg-purple-700 text-white"
            }
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : existingDecision?.isRecent ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Up to Date
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Analyze for Decisions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Existing Decision Alert */}
      {existingDecision && (
        <Card className={existingDecision.isRecent 
          ? "border-green-500 bg-green-50/50" 
          : "border-blue-500 bg-blue-50/50"
        }>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {existingDecision.isRecent ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Calendar className="h-5 w-5 text-blue-600" />
                )}
                <CardTitle className={existingDecision.isRecent 
                  ? "text-green-900 dark:text-green-100" 
                  : "text-blue-900 dark:text-blue-100"
                }>
                  {existingDecision.isRecent 
                    ? "✅ Already Analyzed (Up to Date)" 
                    : "📋 Previously Analyzed"
                  }
                </CardTitle>
              </div>
              <Badge variant={existingDecision.isRecent ? "default" : "secondary"} 
                className={existingDecision.isRecent ? "bg-green-100 text-green-700" : ""}>
                {formatRelativeTime(existingDecision.createdAt)}
              </Badge>
            </div>
            <CardDescription className={existingDecision.isRecent 
              ? "text-green-700 dark:text-green-300" 
              : "text-blue-700 dark:text-blue-300"
            }>
              {existingDecision.isRecent 
                ? "This channel has been analyzed recently. View the decision details below or check the Decisions page."
                : "This channel was analyzed before. You can re-analyze to check for new decisions."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {existingDecision.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {existingDecision.summary}
              </p>
              <div className="flex items-center gap-4 pt-2">
                <span className="text-sm text-gray-500">
                  Confidence: {Math.round(existingDecision.confidence * 100)}%
                </span>
                <Link href="/decisions">
                  <Button variant="link" className="p-0 h-auto text-purple-600 hover:text-purple-700">
                    View All Decisions →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Progress */}
      {analyzing && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
              <CardTitle className="text-purple-900 dark:text-purple-100">AI Analysis in Progress</CardTitle>
            </div>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Analyzing {messages.length} messages for decisions... This may take 30-60 seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={analysisProgress} className="h-2" />
            <div className="flex items-center justify-between text-sm text-purple-600">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Processing with Groq AI...
              </span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Result */}
      {analysisResult && !analyzing && (
        <Card className={analysisResult.detected ? "border-green-500 bg-green-50/30" : "border-yellow-500 bg-yellow-50/30"}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {analysisResult.detected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <CardTitle className={analysisResult.detected ? "text-green-900 dark:text-green-100" : "text-yellow-900 dark:text-yellow-100"}>
                {analysisResult.detected ? "🎉 Decision Detected!" : "Analysis Complete"}
              </CardTitle>
            </div>
            <CardDescription>
              {analysisResult.message}
              {analysisResult.confidence && (
                <span className="ml-2 font-medium">
                  Confidence: {Math.round(analysisResult.confidence * 100)}%
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {analysisResult.decision && (
            <CardContent>
              <div className="space-y-3">
                <p className="font-medium text-lg text-blue-900 dark:text-blue-100">{analysisResult.decision.title}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {analysisResult.decision.summary}
                </p>
                <Link href="/decisions">
                  <Button variant="link" className="p-0 text-purple-600 hover:text-purple-700">
                    View all decisions →
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Messages List with Skeleton Loading */}
      {loading ? (
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-purple-900 dark:text-purple-100">Loading Messages...</CardTitle>
          </CardHeader>
          <CardContent>
            <SkeletonMessage count={5} />
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <EmptyState type="slack" />
      ) : (
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-purple-900 dark:text-purple-100">Recent Messages ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.ts}
                className={`p-4 rounded-lg transition-colors hover:bg-purple-50/50 dark:hover:bg-purple-900/10 ${
                  index % 2 === 0 ? "bg-zinc-50 dark:bg-zinc-900" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-purple-700 dark:text-purple-300">{message.user}</span>
                      <span className="text-xs text-zinc-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.replyCount && message.replyCount > 0 && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          {message.replyCount} replies
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {message.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
