"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase-singleton"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [hasSupabase, setHasSupabase] = useState(false)

  // Check if already logged in
  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      try {
        if (!supabase) {
          console.log("⚠️ Supabase not configured - demo mode")
          setHasSupabase(false)
          setIsCheckingSession(false)
          return
        }

        setHasSupabase(true)
        console.log("[Login] Checking for existing session...")
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("[Login] Already logged in, redirecting to dashboard")
          router.replace("/dashboard")
          return
        }

        console.log("[Login] No session found, showing login form")
        setIsCheckingSession(false)
      } catch (error) {
        console.error("[Login] Error checking session:", error)
        setHasSupabase(false)
        setIsCheckingSession(false)
      }
    }

    redirectIfLoggedIn()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!supabase) {
      // Demo mode - simulate login
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        router.push("/dashboard")
      }, 1500)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsEmailNotConfirmed(false)
    setResendSuccess(false)

    try {
      console.log("[CLIENT] Attempting login with email:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("[CLIENT] Login error:", error.message)

        if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
          setIsEmailNotConfirmed(true)
        } else {
          setError(error.message)
        }

        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError("Invalid credentials")
        setIsLoading(false)
        return
      }

      console.log("[CLIENT] Login successful, redirecting to dashboard...")
      router.replace("/dashboard")
    } catch (err: any) {
      console.error("[CLIENT] Unexpected login error:", err)
      setError(err.message || "An unexpected error occurred")
      setIsLoading(false)
    }
  }

  async function handleResendConfirmation() {
    if (!supabase) return

    setResendingEmail(true)
    setResendSuccess(false)
    setError(null)

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) {
        console.error("[CLIENT] Error resending confirmation email:", error.message)
        setError(`Failed to resend: ${error.message}`)
      } else {
        setResendSuccess(true)
      }
    } catch (err: any) {
      console.error("[CLIENT] Unexpected error resending confirmation:", err)
      setError(err.message || "An unexpected error occurred")
    } finally {
      setResendingEmail(false)
    }
  }

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image
              src="/placeholder.svg?height=40&width=40&text=PWT"
              alt="Peer Wealth Token"
              width={40}
              height={40}
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-2xl text-white">Welcome back!</CardTitle>
          <CardDescription className="text-slate-400">Sign in to your Peer Wealth Token account</CardDescription>

          {!hasSupabase && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-400 mt-2">
              <Shield className="w-3 h-3 mr-1" />
              Demo Mode
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email not confirmed message */}
          {isEmailNotConfirmed && hasSupabase && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                <p className="font-medium mb-2">Email not confirmed</p>
                <p className="text-sm mb-3">
                  Please check your inbox and confirm your email address before logging in.
                </p>
                <div className="flex justify-between items-center">
                  <Button
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {resendingEmail ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Resend confirmation email"
                    )}
                  </Button>
                  <Link href="/resend-verification" className="text-sm text-yellow-200 hover:text-white">
                    Need help?
                  </Link>
                </div>
                {resendSuccess && (
                  <div className="flex items-center mt-2 text-green-300 text-sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Confirmation email sent! Please check your inbox.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && !isEmailNotConfirmed && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {/* Demo mode info */}
          {!hasSupabase && (
            <Alert className="border-blue-500 bg-blue-500/10">
              <Shield className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <p className="font-medium">Demo Mode Active</p>
                <p className="text-sm">
                  Database not connected. You can explore the interface, but data won't persist.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-slate-300">
                <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-700" />
                Remember me
              </label>

              <Link href="/forgot-password" className="text-yellow-400 hover:text-yellow-300">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {hasSupabase ? "Signing in..." : "Entering demo..."}
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">OR</span>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <Link href="/resend-verification" className="block text-center">
              <Button variant="outline" className="w-full text-white border-slate-600 hover:bg-slate-700">
                Resend Verification Email
              </Button>
            </Link>

            <div className="text-center">
              <p className="text-sm text-slate-400">Not a member yet?</p>
              <Link href="/register" className="text-yellow-400 hover:text-yellow-300 font-medium">
                Create an account
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
