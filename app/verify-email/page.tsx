"use client"

import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle, Mail } from "lucide-react"

export default function VerifyEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const [countdown, setCountdown] = useState(60)
  const [isResending, setIsResending] = useState(false)

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Function to handle resend verification email
  const handleResendEmail = async () => {
    if (countdown > 0 || !email) return

    setIsResending(true)

    // Here you would typically call your API to resend the verification email
    // For now, we'll just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsResending(false)
    setCountdown(60) // Reset countdown
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

          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="bg-green-500/20 rounded-full p-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-center text-2xl font-medium text-white">Verify Your Email</h2>

          {/* Message */}
          <div className="bg-[#3a3d4a] rounded-lg p-4 text-center">
            <p className="text-white mb-2">Registration successful!</p>
            <p className="text-gray-300 text-sm mb-2">We've sent a verification link to:</p>
            <p className="text-yellow-300 font-medium mb-3">{email || "your email address"}</p>
            <p className="text-gray-300 text-sm">Please check your inbox and click the link to verify your account.</p>
          </div>

          {/* Email icon */}
          <div className="flex justify-center py-4">
            <Mail className="w-16 h-16 text-[#fff27a]" />
          </div>

          <p className="text-center text-sm text-gray-400">
            If you don't see the email, please check your spam folder.
          </p>

          {/* Resend button */}
          <div className="flex justify-center">
            <button
              onClick={handleResendEmail}
              disabled={countdown > 0 || isResending}
              className={`text-sm ${
                countdown > 0 || isResending ? "text-gray-500 cursor-not-allowed" : "text-blue-400 hover:text-blue-300"
              }`}
            >
              {isResending
                ? "Sending..."
                : countdown > 0
                  ? `Resend email (${countdown}s)`
                  : "Resend verification email"}
            </button>
          </div>

          {/* Back to login button */}
          <div className="pt-4">
            <Link href="/login" className="block">
              <button className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors">
                Back to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
