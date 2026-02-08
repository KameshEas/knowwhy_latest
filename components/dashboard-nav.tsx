"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Video, Search, Settings, MessageSquare, GitBranch } from "lucide-react"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Search",
    href: "/search",
    icon: Search,
    color: "text-zinc-600",
    bgColor: "bg-zinc-50",
  },
  {
    title: "Decisions",
    href: "/decisions",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: Video,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Slack",
    href: "/slack",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "GitLab",
    href: "/gitlab",
    icon: GitBranch,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    color: "text-zinc-600",
    bgColor: "bg-zinc-50",
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg",
              isActive
                ? `${item.color} ${item.bgColor} dark:bg-opacity-10`
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            <item.icon className={cn("h-4 w-4", isActive ? item.color : "")} />
            {item.title}
            {isActive && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}