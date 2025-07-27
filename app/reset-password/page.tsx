"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function ResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [hasSession, setHasSession] = useState(false)

  // Verify the token as soon as the component mounts
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setIsVerifying(true)

        // Get token and type from URL
        const token = searchParams?.get("token")
        const type = searchParams?.get("type") || "recovery"

        console.log("Verifying token:", token ? `${token.substring(0, 10)}...` : "No token", "Type:", type)

        if (!token) {
          console.error("No token found in URL")
          setMessage({
            type: "error",
            text: "Invalid or expired password reset link. Please request a new one.",
          })
          setIsVerifying(false)
          return
        }

        // Verify the token directly
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        })

        if (error) {
          console.error("Token verification error:", error.message)
          setMessage({
            type: "error",
            text: "Invalid or expired password reset link. Please request a new one.",
          })
        } else {
          console.log("Token verification successful:", data)
          setHasSession(true)
        }
      } catch (err: any) {
        console.error("Token verification exception:", err.message)
        setMessage({
          type: "error",
          text: "Error processing reset link. Please request a new one.",
        })
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [searchParams])

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" })
      return
    }

    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long" })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      console.log("Updating password")
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.error("Password update error:", error.message)
        setMessage({ type: "error", text: error.message })
      } else {
        console.log("Password updated successfully")
        setMessage({
          type: "success",
          text: "Password updated successfully! Redirecting to login...",
        })

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    } catch (err: any) {
      console.error("Password update exception:", err.message)
      setMessage({ type: "error", text: err.message || "An unexpected error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage:
          "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/peerWealth_Cursor.png-c2lG2VfEYHcmowwpSnYj2xfYm1gZv5.jpeg')",
      }}
    >
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
          <h2 className="text-center text-2xl font-medium text-white">Create New Password</h2>
          <p className="text-center text-sm text-gray-300">Enter your new password below.</p>

          {/* Loading state */}
          {isVerifying && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-300"></div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`${
                message.type === "success"
                  ? "bg-green-500/20 border-green-500 text-green-300"
                  : "bg-red-500/20 border-red-500 text-red-300"
              } px-4 py-2 rounded-md text-sm border`}
            >
              {message.text}
            </div>
          )}

          {/* Form */}
          {!isVerifying && hasSession ? (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
                  required
                  minLength={8}
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          ) : (
            !isVerifying &&
            !hasSession && (
              <div className="text-center">
                <Link href="/forgot-password" className="text-yellow-300 hover:text-yellow-200 block py-2">
                  Request a new password reset link
                </Link>
              </div>
            )
          )}

          {/* Back to login */}
          <div className="text-center mt-4">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
