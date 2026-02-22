"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb } from "lucide-react"

import React, { useRef } from "react"
// ...existing imports...

function ParallaxCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * 8 // max 8deg
    const rotateY = ((x - centerX) / centerX) * -8
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }
  const handleMouseLeave = () => {
    const card = cardRef.current
    if (card) card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)"
  }
  return (
    <div
      ref={cardRef}
      className="w-full max-w-md shadow-lg transition-transform duration-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ willChange: "transform" }}
    >
      {children}
    </div>
  )
}


function LoginPage() {
  const [loading, setLoading] = useState(false)
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated Gradient Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(120deg,#071021,#0b3b4a,#3b2e8a,#7c3aed)",
          backgroundSize: "200% 200%",
          animation: "gradientMove 14s ease-in-out infinite"
        }}
      />
      {/* SVG Blobs */}
      <svg
        className="absolute top-[-80px] left-[-120px] w-[400px] h-[400px] z-0"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "blur(60px)", opacity: 0.13 }}
      >
        <circle cx="200" cy="200" r="160" fill="#7c3aed" />
      </svg>
      <svg
        className="absolute bottom-[-60px] right-[-100px] w-[320px] h-[320px] z-0"
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "blur(40px)", opacity: 0.11 }}
      >
        <ellipse cx="160" cy="160" rx="120" ry="100" fill="#0ea5e9" />
      </svg>
      {/* Main Card Content */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animated-bg { animation: none !important; }
        }
      `}</style>
      <div className="relative z-10 w-full flex items-center justify-center">
        <ParallaxCard>
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-7 h-7 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Welcome to KnowWhy</CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                AI-powered Decision Memory System
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 text-center">
                Sign in to capture and recall your team&#39;s decisions. Never lose track of why decisions were made.
              </p>
              <Button
                type="button"
                className="w-full flex items-center justify-center gap-3 h-12"
                variant="outline"
                aria-label="Sign in with Google"
                disabled={loading}
                onClick={async () => {
                  setLoading(true)
                  try {
                    await signIn("google", { callbackUrl: "/dashboard" })
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {loading ? (
                  <span className="w-5 h-5 animate-spin border-2 border-t-transparent border-zinc-400 rounded-full" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span>{loading ? "Signing in..." : "Continue with Google"}</span>
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-4 text-center">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </ParallaxCard>
      </div>
    </div>
  )
}

export default LoginPage