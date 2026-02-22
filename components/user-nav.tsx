"use client"

import Image from "next/image"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

interface UserNavProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function UserNav({ user }: UserNavProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-2">
        {user?.image ? (
          <Image
            src={user.image}
            alt={user.name || "User"}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border-2 border-zinc-100 dark:border-zinc-800"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center border-2 border-zinc-100 dark:border-zinc-800">
            <User className="h-5 w-5 text-zinc-500" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
          <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center justify-start gap-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}
