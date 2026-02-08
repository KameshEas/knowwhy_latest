import { prisma } from "./prisma"

interface GitLabProject {
  id: number
  name: string
  path_with_namespace: string
  description: string | null
  visibility: string
  created_at: string
  last_activity_at: string
  web_url: string
}

export async function getGitLabProjects(userId: string): Promise<GitLabProject[]> {
  const integration = await prisma.gitLabIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("GitLab not connected")
  }

  const response = await fetch(
    `${integration.gitlabUrl}/api/v4/projects?membership=true&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch projects")
  }

  return response.json()
}

export async function getGitLabMergeRequests(
  userId: string,
  projectId: number,
  state: string = "all"
) {
  const integration = await prisma.gitLabIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("GitLab not connected")
  }

  const response = await fetch(
    `${integration.gitlabUrl}/api/v4/projects/${projectId}/merge_requests?state=${state}&per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch merge requests")
  }

  return response.json()
}

export async function getGitLabMergeRequestDiscussions(
  userId: string,
  projectId: number,
  mrIid: number
) {
  const integration = await prisma.gitLabIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("GitLab not connected")
  }

  const response = await fetch(
    `${integration.gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch discussions")
  }

  return response.json()
}

// ==================== GITLAB ISSUES ====================

export interface GitLabIssue {
  id: number
  iid: number
  title: string
  description: string | null
  state: string
  created_at: string
  updated_at: string
  closed_at: string | null
  author: {
    name: string
    username: string
  }
  assignees: Array<{
    name: string
    username: string
  }>
  labels: string[]
  web_url: string
  user_notes_count: number
}

export async function getGitLabIssues(
  userId: string,
  projectId: number,
  state: string = "all"
): Promise<GitLabIssue[]> {
  const integration = await prisma.gitLabIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("GitLab not connected")
  }

  const response = await fetch(
    `${integration.gitlabUrl}/api/v4/projects/${projectId}/issues?state=${state}&per_page=50&order_by=updated_at&sort=desc`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch issues")
  }

  return response.json()
}

export interface GitLabNote {
  id: number
  body: string
  author: {
    name: string
    username: string
  }
  created_at: string
  updated_at: string
  system: boolean
}

export async function getGitLabIssueNotes(
  userId: string,
  projectId: number,
  issueIid: number
): Promise<GitLabNote[]> {
  const integration = await prisma.gitLabIntegration.findUnique({
    where: { userId },
  })

  if (!integration) {
    throw new Error("GitLab not connected")
  }

  const response = await fetch(
    `${integration.gitlabUrl}/api/v4/projects/${projectId}/issues/${issueIid}/notes?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Failed to fetch issue notes")
  }

  return response.json()
}
