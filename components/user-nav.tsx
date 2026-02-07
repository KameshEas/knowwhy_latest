"use client"

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
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-xs text-zinc-500">{user?.email}</p>
      </div>
      {user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name || "User"}
          className="h-8 w-8 rounded-full"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
          <User className="h-4 w-4 text-zinc-500" />
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}