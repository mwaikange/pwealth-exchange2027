"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase-singleton"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peer-wealth.com"}/auth/reset-password`,
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({
          type: "success",
          text: "Password reset email sent! Please check your inbox.",
        })
        setEmail("")
      }
    } catch (err: any) {
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
          <h2 className="text-center text-2xl font-medium text-white">Reset Your Password</h2>
          <p className="text-center text-sm text-gray-300">
            Enter your email address below to receive a password reset link.
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
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
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
              {isLoading ? "Sending..." : "Reset Password"}
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
