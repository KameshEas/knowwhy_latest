"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  GitBranch,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe,
  Calendar,
  FolderGit
} from "lucide-react"
import { toast } from "sonner"

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

export default function GitLabProjectsPage() {
  const [projects, setProjects] = useState<GitLabProject[]>([])
  const [filteredProjects, setFilteredProjects] = useState<GitLabProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gitlab/projects")
      const data = await response.json()
      
      if (data.success) {
        setProjects(data.projects)
        setFilteredProjects(data.projects)
      } else {
        toast.error(data.error || "Failed to fetch projects")
      }
    } catch (error) {
      toast.error("Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitLab Projects</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Browse and manage your GitLab projects for decision detection.
          </p>
        </div>
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
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <FolderGit className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderGit className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-medium">No projects found</h3>
            <p className="text-zinc-500 mt-2">
              {searchQuery
                ? "No projects match your search."
                : "Connect your GitLab account to see projects here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-zinc-500" />
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                  {project.visibility === "private" ? (
                    <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Private</Badge>
                  ) : (
                    <Badge variant="outline"><Globe className="h-3 w-3 mr-1" /> {project.visibility}</Badge>
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
                <div className="flex items-center justify-between pt-2 text-sm text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(project.createdAt)}
                  </div>
                  <a 
                    href={project.webUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}