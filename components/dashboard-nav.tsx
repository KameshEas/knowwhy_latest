"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Decisions",
    href: "/decisions",
  },
  {
    title: "Meetings",
    href: "/meetings",
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50",
            pathname === item.href
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}