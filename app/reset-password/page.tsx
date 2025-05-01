"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase-singleton"

export default function ResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Check if user is authenticated with a recovery token
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsCheckingSession(true)

        // Check if we were redirected with a verified parameter
        const verified = searchParams?.get("verified")
        if (verified === "true") {
          console.log("Token was verified by the server, session should be available")
        }

        // Get the current session
        const { data } = await supabase.auth.getSession()
        console.log("Reset password session check:", data.session ? "Session found" : "No session")

        if (data.session) {
          setHasSession(true)
          return
        }

        // If no session, check for hash in URL (Supabase sometimes adds it)
        const hash = window.location.hash
        if (hash && (hash.includes("access_token") || hash.includes("recovery_token"))) {
          console.log("Found token in URL hash, attempting to process")

          try {
            // Try to process the hash
            const { data: hashData, error } = await supabase.auth.getSessionFromUrl()

            if (error) {
              console.error("Error processing URL hash:", error.message)
              setMessage({
                type: "error",
                text: "Invalid or expired password reset link. Please request a new one.",
              })
            } else {
              console.log("Successfully processed URL hash:", hashData)
              setHasSession(true)
            }
          } catch (err: any) {
            console.error("Error processing hash:", err.message)
            setMessage({
              type: "error",
              text: "Error processing authentication data. Please request a new password reset link.",
            })
          }
        } else {
          // Last resort - try to directly verify OTP if token is in the URL
          const urlParams = new URLSearchParams(window.location.search)
          const token = urlParams.get("token")

          if (token) {
            console.log("Found token in URL params, attempting direct verification")

            try {
              const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: "recovery",
              })

              if (otpError) {
                console.error("Direct OTP verification error:", otpError.message)
                setMessage({
                  type: "error",
                  text: "Invalid or expired password reset link. Please request a new one.",
                })
              } else {
                console.log("Direct OTP verification successful:", otpData)
                setHasSession(true)
              }
            } catch (otpErr: any) {
              console.error("Direct OTP verification exception:", otpErr.message)
              setMessage({
                type: "error",
                text: "Error verifying reset token. Please request a new password reset link.",
              })
            }
          } else {
            setMessage({
              type: "error",
              text: "Invalid or expired password reset link. Please request a new one.",
            })
          }
        }
      } catch (err: any) {
        console.error("Session check error:", err.message)
        setMessage({
          type: "error",
          text: "Error checking authentication status. Please try again.",
        })
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
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
      console.log("Attempting to update password")
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
          {isCheckingSession && (
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
          {!isCheckingSession && hasSession ? (
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
            !isCheckingSession && (
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
