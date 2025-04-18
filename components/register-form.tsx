"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { registerUser } from "@/actions/auth-actions"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { CountryCombobox } from "./country-combobox"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors"
    >
      {pending ? "Registering..." : "Register"}
    </button>
  )
}

export function RegisterForm() {
  const router = useRouter()
  const [referrerEmail, setReferrerEmail] = useState("")
  const [country, setCountry] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [passwordsMatch, setPasswordsMatch] = useState(true)

  async function handleSubmit(formData: FormData) {
    // Check if passwords match
    if (password !== confirmPassword) {
      setPasswordsMatch(false)
      return
    }

    setError(null)

    // Include country with the other form values
    const formDataWithCountry = new FormData(document.querySelector("form")!)
    formDataWithCountry.append("country", country)

    const result = await registerUser(formDataWithCountry)

    if (result.success) {
      // Redirect to verify email page instead of login
      router.push("/verify-email")
    } else {
      setError(result.message || "Registration failed. Please try again.")
    }
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

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm">{error}</div>
        )}

        {/* Form */}
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              name="referrerEmail"
              placeholder="Referrer's Email Address"
              value={referrerEmail}
              onChange={(e) => setReferrerEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
            />

            <div className="relative">
              <CountryCombobox value={country} onChange={setCountry} placeholder="Country" />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none"
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (confirmPassword) {
                  setPasswordsMatch(e.target.value === confirmPassword)
                }
              }}
              className={`w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none ${!passwordsMatch ? "border border-red-500" : ""}`}
              required
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setPasswordsMatch(password === e.target.value)
              }}
              className={`w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none ${!passwordsMatch ? "border border-red-500" : ""}`}
              required
            />

            {!passwordsMatch && <p className="text-red-500 text-sm">Passwords do not match</p>}
          </div>

          <SubmitButton />
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
