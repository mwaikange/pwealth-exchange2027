"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default function VerifyEmail() {
  const router = useRouter()

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
          <h2 className="text-center text-2xl font-medium text-white">Verify Your Email</h2>

          {/* Message */}
          <div className="bg-[#3a3d4a] rounded-lg p-4 text-center">
            <p className="text-white mb-2">We've sent a verification link to your email address.</p>
            <p className="text-gray-300 text-sm">Please check your inbox and click the link to verify your account.</p>
          </div>

          {/* Email icon */}
          <div className="flex justify-center py-4">
            <svg
              className="w-16 h-16 text-[#fff27a]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <p className="text-center text-sm text-gray-400">
            If you don't see the email, please check your spam folder.
          </p>

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
