"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import Image from "next/image"

export function RegisterForm() {
  const router = useRouter()
  const [referrerEmail, setReferrerEmail] = useState("")
  const [country, setCountry] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push("/dashboard")
  }

  return (
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
        <h2 className="text-center text-2xl font-medium text-white">Peer-2-Peer Wealth Creation!</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Referrer's Email Address"
              value={referrerEmail}
              onChange={(e) => setReferrerEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
            />

            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-[#3a3d4a] rounded-full text-gray-400 focus:outline-none"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span>{country || "Select Country"}</span>
                <ChevronDown className="h-5 w-5" />
              </button>
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#3a3d4a] rounded-md shadow-lg">
                  {["Namibia", "South Africa", "Botswana", "Zimbabwe"].map((c) => (
                    <div
                      key={c}
                      className="px-4 py-2 hover:bg-[#4a4d5a] cursor-pointer text-white"
                      onClick={() => {
                        setCountry(c)
                        setShowDropdown(false)
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors"
          >
            Register
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
            Sign up with Apple
          </button>
          <button className="flex items-center justify-center py-2.5 px-5 bg-[#1c1e26] rounded-full text-white text-xs border border-gray-700 hover:bg-[#2a2d3a] transition-colors whitespace-nowrap">
            <Image src="/google-logo.png" alt="Google logo" width={20} height={20} className="mr-2" />
            Sign up with Google
          </button>
        </div>

        {/* Sign in Link */}
        <div className="text-center">
          <p className="text-sm text-gray-300">Already a Member - Sign in?</p>
        </div>
      </div>

      {/* Sign in Button */}
      <Link href="/login" className="block">
        <button className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 text-black font-medium transition-colors">
          Sign In
        </button>
      </Link>
    </div>
  )
}
