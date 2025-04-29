"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function VerificationSuccess() {
  const router = useRouter()

  // Auto-redirect to dashboard after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden p-4"
      style={{
        backgroundImage:
          "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/peerWealth_Cursor.png-c2lG2VfEYHcmowwpSnYj2xfYm1gZv5.jpeg')",
      }}
    >
      <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg">
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
          <h2 className="text-center text-2xl font-medium text-white">Email Verified Successfully!</h2>

          {/* Message */}
          <div className="bg-[#3a3d4a] rounded-lg p-4 text-center">
            <p className="text-white mb-2">Your email has been verified!</p>
            <p className="text-gray-300 text-sm mb-3">You will be redirected to your dashboard in a few seconds.</p>
            <p className="text-yellow-300 font-medium">Welcome to Peer Wealth!</p>
          </div>

          {/* Dashboard button */}
          <div className="pt-4">
            <Link href="/dashboard" className="block">
              <button className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors">
                Go to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
