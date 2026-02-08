"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  GitBranch,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe,
  Calendar,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Clock,
  Brain
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { SkeletonCard } from "@/components/skeleton-card"

interface GitLabIssue {
  id: number
  iid: number
  title: string
  description: string | null
  state: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  author: {
    name: string
    username: string
  }
  assignees: Array<{
    name: string
    username: string
  }>
  labels: string[]
  webUrl: string
  userNotesCount: number
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

export default function GitLabProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [issues, setIssues] = useState<GitLabIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzingIssueId, setAnalyzingIssueId] = useState<number | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<Record<number, AnalysisResult>>({})

  const fetchIssues = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/gitlab/projects/${projectId}/issues?state=all`)
      const data = await response.json()
      
      if (data.success) {
        setIssues(data.issues)
      } else {
        toast.error(data.error || "Failed to fetch issues")
      }
    } catch (error) {
      toast.error("Failed to fetch issues")
    } finally {
      setLoading(false)
    }
  }

  const analyzeIssue = async (issueIid: number) => {
    setAnalyzingIssueId(issueIid)
    setAnalysisProgress(0)
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 800)
    
    try {
      const response = await fetch(`/api/gitlab/projects/${projectId}/issues/${issueIid}/analyze`, {
        method: "POST",
      })
      
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      
      const data = await response.json()
      
      setAnalysisResults(prev => ({
        ...prev,
        [issueIid]: data
      }))
      
      if (data.success) {
        if (data.detected) {
          toast.success(`🎉 Decision detected! "${data.decision?.title}"`)
        } else {
          toast.info(data.message || "No decisions detected")
        }
      } else {
        toast.error(data.error || "Analysis failed")
      }
    } catch (error) {
      clearInterval(progressInterval)
      toast.error("Failed to analyze issue")
    } finally {
      setTimeout(() => {
        setAnalyzingIssueId(null)
        setAnalysisProgress(0)
      }, 500)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchIssues()
    }
  }, [projectId])

  const openIssues = issues.filter(i => i.state === "opened")
  const closedIssues = issues.filter(i => i.state === "closed")

  const IssueCard = ({ issue }: { issue: GitLabIssue }) => {
    const analysisResult = analysisResults[issue.iid]
    const isAnalyzing = analyzingIssueId === issue.iid

    return (
      <Card className="hover:shadow-lg hover:border-orange-300 transition-all border-2 border-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-900 dark:text-orange-100">#{issue.iid} {issue.title}</CardTitle>
            </div>
            <Badge 
              variant={issue.state === "opened" ? "default" : "secondary"}
              className={issue.state === "opened" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
            >
              {issue.state}
            </Badge>
          </div>
          <CardDescription>
            Created by {issue.author.name} on {format(new Date(issue.createdAt), "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {issue.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
              {issue.description}
            </p>
          )}
          
          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-xs border-orange-200 text-orange-600">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-sm text-orange-600">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {issue.userNotesCount} comments
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Updated {format(new Date(issue.updatedAt), "MMM d")}
              </span>
            </div>
            <div className="flex gap-2">
              <a 
                href={issue.webUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800 hover:underline"
              >
                View <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-orange-600 animate-pulse" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-100">Analyzing for decisions...</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
              <div className="flex justify-between text-xs text-orange-600 mt-1">
                <span>Processing with AI...</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && !isAnalyzing && (
            <div className={`mt-4 p-4 rounded-lg ${
              analysisResult.detected 
                ? "bg-green-50 dark:bg-green-900/10 border border-green-200" 
                : "bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200"
            }`}>
              <div className="flex items-center gap-2">
                {analysisResult.detected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className={`font-medium ${
                  analysisResult.detected ? "text-green-900" : "text-yellow-900"
                }`}>
                  {analysisResult.detected ? "Decision Detected!" : "Analysis Complete"}
                </span>
              </div>
              {analysisResult.decision && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-blue-900">{analysisResult.decision.title}</p>
                  <p className="text-xs text-zinc-600 mt-1">{analysisResult.decision.summary}</p>
                  <Link href="/decisions">
                    <Button variant="link" className="p-0 h-auto text-orange-600 text-xs">
                      View in decisions →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Analyze Button */}
          {!isAnalyzing && !analysisResult && issue.userNotesCount > 0 && (
            <Button 
              onClick={() => analyzeIssue(issue.iid)}
              className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white"
              size="sm"
            >
              <Brain className="mr-2 h-4 w-4" />
              Analyze for Decisions
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/gitlab">
            <Button variant="outline" size="icon" className="hover:bg-orange-50 hover:border-orange-300">
              <ArrowLeft className="h-4 w-4 text-orange-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-orange-900 dark:text-orange-100">Project Issues</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              View and analyze GitLab issues for decisions.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchIssues}
          disabled={loading}
          className="hover:bg-orange-50 hover:border-orange-300"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-600" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4 text-orange-600" />
          )}
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="border-orange-100">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100">Loading Issues...</CardTitle>
          </CardHeader>
          <CardContent>
            <SkeletonCard count={3} />
          </CardContent>
        </Card>
      ) : issues.length === 0 ? (
        <Card className="border-orange-100">
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-orange-300 mb-4" />
            <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">No issues found</h3>
            <p className="text-zinc-500 mt-2">
              This project doesn't have any issues yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="open">
              Open ({openIssues.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({closedIssues.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="open" className="mt-6">
            <div className="grid gap-4">
              {openIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="closed" className="mt-6">
            <div className="grid gap-4">
              {closedIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}