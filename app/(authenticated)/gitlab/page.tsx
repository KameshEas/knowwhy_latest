"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  GitBranch,
  RefreshCw,
  Lock,
  Globe,
  Calendar,
  FolderGit,
  MessageSquare,
  ArrowRight,
  Webhook,
  CheckCircle,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"

interface GitLabProject {
  id: number
  name: string
  path: string
  description: string | null
  visibility: string
  createdAt: string
  lastActivityAt: string
  webUrl: string
}

interface ProjectWebhookStatus {
  [projectId: number]: {
    configured: boolean
    loading: boolean
  }
}

export default function GitLabProjectsPage() {
  const [projects, setProjects] = useState<GitLabProject[]>([])
  const [filteredProjects, setFilteredProjects] = useState<GitLabProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<ProjectWebhookStatus>({})

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gitlab/projects")
      const data = await response.json()
      
      if (data.success) {
        setProjects(data.projects)
        setFilteredProjects(data.projects)
      } else {
        setError(data.error || "Failed to fetch projects")
        toast.error(data.error || "Failed to fetch projects")
      }
    } catch {
      setError("Failed to fetch projects")
      toast.error("Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }

  // Check webhook status for all projects
  const checkWebhookStatus = async () => {
    try {
      const response = await fetch("/api/webhooks/gitlab/configure")
      const data = await response.json()
      
      if (data.success && data.projects) {
        const status: ProjectWebhookStatus = {}
        data.projects.forEach((project: { id: number; webhookConfigured: boolean }) => {
          status[project.id] = {
            configured: project.webhookConfigured,
            loading: false
          }
        })
        setWebhookStatus(status)
      }
    } catch (error) {
      console.error("Failed to check webhook status:", error)
    }
  }

  // Configure webhook for a specific project
  const configureWebhook = async (projectId: number, projectName: string) => {
    setWebhookStatus(prev => ({
      ...prev,
      [projectId]: { configured: false, loading: true }
    }))

    try {
      // Get webhook URL
      const configResponse = await fetch("/api/webhooks/config")
      const configData = await configResponse.json()
      
      if (!configData.success) {
        throw new Error("Failed to get webhook URL")
      }

      const webhookUrl = configData.webhooks.gitlab.url

      const response = await fetch("/api/webhooks/gitlab/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, webhookUrl })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Webhook configured for ${projectName}!`)
        setWebhookStatus(prev => ({
          ...prev,
          [projectId]: { configured: true, loading: false }
        }))
      } else {
        throw new Error(data.error || "Failed to configure webhook")
      }
    } catch (error) {
      console.error("Failed to configure webhook:", error)
      toast.error(error instanceof Error ? error.message : "Failed to configure webhook")
      setWebhookStatus(prev => ({
        ...prev,
        [projectId]: { configured: false, loading: false }
      }))
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Check webhook status after projects are loaded
  useEffect(() => {
    if (projects.length > 0) {
      checkWebhookStatus()
    }
  }, [projects.length])

  useEffect(() => {
    if (searchQuery) {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredProjects(filtered)
    } else {
      setFilteredProjects(projects)
    }
  }, [searchQuery, projects])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Check if GitLab is not connected
  const isNotConnected = error?.includes("not connected") || error?.includes("Unauthorized") || (projects.length === 0 && !loading && !searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-orange-900 dark:text-orange-100">GitLab Projects</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Browse and manage your GitLab projects for decision detection.
          </p>
        </div>
        {!isNotConnected && (
          <Button
            variant="outline"
            onClick={fetchProjects}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        )}
      </div>

      {!isNotConnected && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <FolderGit className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-orange-200 focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {loading ? (
        <Card className="border-orange-100">
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-4 text-zinc-500">Loading GitLab projects...</p>
          </CardContent>
        </Card>
      ) : isNotConnected ? (
        <EmptyState type="gitlab" />
      ) : filteredProjects.length === 0 ? (
        <Card className="border-orange-100">
          <CardContent className="py-12 text-center">
            <FolderGit className="mx-auto h-12 w-12 text-orange-300 mb-4" />
            <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">No projects found</h3>
            <p className="text-zinc-500 mt-2">
              {searchQuery
                ? "No projects match your search."
                : "No projects available in your GitLab account."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg hover:border-orange-300 transition-all border-2 border-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg text-orange-900 dark:text-orange-100">{project.name}</CardTitle>
                  </div>
                  {project.visibility === "private" ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700"><Lock className="h-3 w-3 mr-1" /> Private</Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-200 text-orange-600"><Globe className="h-3 w-3 mr-1" /> {project.visibility}</Badge>
                  )}
                </div>
                <CardDescription className="truncate">
                  {project.path}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                {/* Webhook Status */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {webhookStatus[project.id]?.loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                        <span className="text-sm text-orange-600">Checking...</span>
                      </>
                    ) : webhookStatus[project.id]?.configured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Webhook configured</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm text-zinc-500">No webhook</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-sm">
                  <div className="flex items-center gap-1 text-orange-600">
                    <Calendar className="h-4 w-4" />
                    {formatDate(project.createdAt)}
                  </div>
                  <div className="flex gap-2">
                    {/* Configure Webhook Button */}
                    {!webhookStatus[project.id]?.configured && !webhookStatus[project.id]?.loading && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => configureWebhook(project.id, project.name)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Webhook className="mr-1 h-4 w-4" />
                        Configure
                      </Button>
                    )}
                    <Link href={`/gitlab/${project.id}`}>
                      <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Issues <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
