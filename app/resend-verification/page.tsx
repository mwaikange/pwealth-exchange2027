"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

export default function ResendVerification() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleResendVerification(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      // Call our resend verification API
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        // Success message
        setMessage({
          type: "success",
          text: data.message || "Verification email has been sent. Please check your inbox.",
        })
        setEmail("")
      } else if (response.status === 404) {
        // User not found (404)
        setMessage({
          type: "error",
          text: data.message || "User not found.",
        })
      } else {
        // Other errors
        setMessage({
          type: "error",
          text: data.message || "An unexpected error occurred",
        })
      }
    } catch (err: any) {
      console.error("Unexpected error:", err)
      setMessage({
        type: "error",
        text: err.message || "An unexpected error occurred",
      })
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
          <h2 className="text-center text-2xl font-medium text-white">Resend Verification Email</h2>
          <p className="text-center text-sm text-gray-300">
            Enter your email address below to receive a new verification link.
          </p>

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
              {message.text === "User does not exist. Register now." && (
                <div className="mt-2">
                  <Link href="/register" className="text-blue-300 hover:text-blue-200 underline">
                    Register here
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleResendVerification} className="space-y-6">
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors"
            >
              {isLoading ? "Sending..." : "Resend Verification"}
            </button>
          </form>

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
