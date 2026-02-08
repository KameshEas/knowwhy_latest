"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, MessageSquare, Video, GitBranch, ArrowRight, Lightbulb } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  type: "decisions" | "meetings" | "slack" | "gitlab" | "search"
  onDemoData?: () => void
}

const config = {
  decisions: {
    icon: Sparkles,
    title: "No decisions captured yet",
    description: "Connect your meeting or chat tools to automatically detect and track decisions with AI.",
    color: "blue",
    steps: [
      { icon: Video, text: "Connect Google Meet", link: "/meetings", color: "green" },
      { icon: MessageSquare, text: "Connect Slack workspace", link: "/settings", color: "purple" },
      { icon: GitBranch, text: "Link GitLab projects", link: "/gitlab", color: "orange" },
    ],
  },
  meetings: {
    icon: Video,
    title: "No meetings connected",
    description: "Connect your Google Calendar to start tracking meeting decisions automatically.",
    color: "green",
    steps: [
      { icon: Video, text: "Connect Google Calendar", link: "/settings", color: "green" },
    ],
  },
  slack: {
    icon: MessageSquare,
    title: "No Slack workspace connected",
    description: "Connect your Slack workspace to analyze channel conversations for decisions.",
    color: "purple",
    steps: [
      { icon: MessageSquare, text: "Connect Slack", link: "/settings", color: "purple" },
    ],
  },
  gitlab: {
    icon: GitBranch,
    title: "No GitLab account connected",
    description: "Connect GitLab to track technical decisions from merge requests and issues.",
    color: "orange",
    steps: [
      { icon: GitBranch, text: "Connect GitLab", link: "/settings", color: "orange" },
    ],
  },
  search: {
    icon: Lightbulb,
    title: "Start exploring your decisions",
    description: "Search through all your captured decisions to find the context you need.",
    color: "blue",
    steps: [],
  },
}

const colorClasses: Record<string, { bg: string; text: string; border: string; button: string }> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/10",
    text: "text-blue-600",
    border: "border-blue-200 dark:border-blue-800",
    button: "bg-blue-600 hover:bg-blue-700",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/10",
    text: "text-green-600",
    border: "border-green-200 dark:border-green-800",
    button: "bg-green-600 hover:bg-green-700",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/10",
    text: "text-purple-600",
    border: "border-purple-200 dark:border-purple-800",
    button: "bg-purple-600 hover:bg-purple-700",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/10",
    text: "text-orange-600",
    border: "border-orange-200 dark:border-orange-800",
    button: "bg-orange-600 hover:bg-orange-700",
  },
}

export function EmptyState({ type, onDemoData }: EmptyStateProps) {
  const { icon: Icon, title, description, color, steps } = config[type]
  const colors = colorClasses[color]

  return (
    <Card className={`${colors.bg} border-2 ${colors.border}`}>
      <CardContent className="py-12 px-6">
        <div className="text-center max-w-md mx-auto">
          {/* Animated Icon */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${colors.bg} mb-6 animate-pulse`}>
            <Icon className={`w-10 h-10 ${colors.text}`} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {title}
          </h3>

          {/* Description */}
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            {description}
          </p>

          {/* Setup Steps */}
          {steps.length > 0 && (
            <div className="space-y-3 mb-8">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                Get started in {steps.length} {steps.length === 1 ? "step" : "steps"}:
              </p>
              {steps.map((step, index) => (
                <Link key={step.text} href={step.link}>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${colorClasses[step.color].bg}`}>
                      <step.icon className={`w-4 h-4 ${colorClasses[step.color].text}`} />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {index + 1}. {step.text}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Demo Data Option */}
          {onDemoData && (
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 mb-4">
                Want to see how it works first?
              </p>
              <Button
                variant="outline"
                onClick={onDemoData}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Load Demo Data
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
