"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase-singleton"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [showPopup, setShowPopup] = useState(true)

  // Check if already logged in
  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      try {
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
        setIsCheckingSession(false)
      }
    }

    redirectIfLoggedIn()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[CLIENT] Attempting login with email:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("[CLIENT] Login error:", error.message)
        setError(error.message)
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError("Invalid credentials")
        setIsLoading(false)
        return
      }

      // Log the session to verify it exists
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log("[CLIENT] Session after login:", session ? "Session exists" : "No session")

      console.log("[CLIENT] Login successful, redirecting to dashboard...")

      // Use Next.js router for navigation after successful login
      router.replace("/dashboard")
    } catch (err: any) {
      console.error("[CLIENT] Unexpected login error:", err)
      setError(err.message || "An unexpected error occurred")
      setIsLoading(false)
    }
  }

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1c1e26] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage:
          "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/peerWealth_Cursor.png-c2lG2VfEYHcmowwpSnYj2xfYm1gZv5.jpeg')",
      }}
    >
      {showPopup && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md bg-[#2e3137] rounded-xl shadow-lg overflow-hidden z-50 border border-gray-700">
          <div className="relative p-5">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="text-center text-white">
              <p className="mb-3">
                Please take note we are in Soft Launch Phase and this is currently a desktop application that works
                seamlessly on laptop & tablet devices.
              </p>
              <p className="mb-4">Would You like to Visit the Home Page for more info First?</p>

              <a
                href="https://peer-wealth.vercel.app/"
                className="inline-block px-6 py-2 bg-[#fff27a] hover:bg-yellow-400 text-black font-medium rounded-full transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Home Page
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg transform scale-75 origin-center">
        <div className="bg-[#2e3137] p-6 space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%203491%20%281%29%2013-abVgGwfyDhrdu9TeQuBQhPA6OCXAKz.png"
              alt="Peer Wealth Token"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>

          {/* Heading */}
          <h2 className="text-center text-2xl font-medium text-white">Welcome back!</h2>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm">{error}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
                required
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  name="remember"
                  className="h-4 w-4 rounded border-gray-600 bg-[#3a3d4a]"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-300">
                  Remember
                </label>
              </div>

              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#2e3137] text-gray-400">OR</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="flex justify-center gap-4">
            <button className="flex items-center justify-center py-2.5 px-5 bg-[#1c1e26] rounded-full text-white text-xs border border-gray-700 hover:bg-[#2a2d3a] transition-colors whitespace-nowrap">
              <Image src="/apple-logo.png" alt="Apple logo" width={20} height={20} className="mr-2" />
              Sign in with Apple
            </button>
            <button className="flex items-center justify-center py-2.5 px-5 bg-[#1c1e26] rounded-full text-white text-xs border border-gray-700 hover:bg-[#2a2d3a] transition-colors whitespace-nowrap">
              <Image src="/google-logo.png" alt="Google logo" width={20} height={20} className="mr-2" />
              Sign in with Google
            </button>
          </div>

          {/* Resend Verification Link */}
          <div className="text-center mt-4 mb-2">
            <Link href="/resend-verification" className="text-sm text-white hover:text-gray-300">
              Resend Verification Email
            </Link>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-300">Not a member yet?</p>
          </div>
        </div>

        {/* Register Buttons */}
        <Link href="https://peerwealth.vercel.app/" className="block mb-2">
          <button className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">
            Home
          </button>
        </Link>
        <Link href="/register" className="block">
          <button className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 text-black font-medium transition-colors">
            Register
          </button>
        </Link>
      </div>
    </div>
  )
}
