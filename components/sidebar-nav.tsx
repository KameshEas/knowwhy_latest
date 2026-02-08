"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Video, Search, Settings, MessageSquare, GitBranch, Brain } from "lucide-react"
import { UserNav } from "./user-nav"
import { Session } from "next-auth"

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

interface SidebarNavProps {
  user: Session["user"]
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold">KnowWhy</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? `${item.bgColor} ${item.color} dark:bg-opacity-20 font-medium`
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                isActive ? item.bgColor : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
              )}>
                <item.icon className={cn("h-5 w-5", isActive ? item.color : "text-zinc-500 dark:text-zinc-400")} />
              </div>
              <span className="text-sm">{item.title}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <UserNav user={user} />
      </div>
    </aside>
  )
}
