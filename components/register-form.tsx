"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { register } from "@/lib/auth"
import { CountryCombobox } from "./country-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [country, setCountry] = useState("")
  const [referrerEmail, setReferrerEmail] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLookingUpReferral, setIsLookingUpReferral] = useState(false)

  // Check for referral code in URL
  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref) {
      setIsLookingUpReferral(true)
      setReferralCode(ref)

      // Look up the referrer's email from the referral code
      fetch(`/api/referral/lookup?code=${ref}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.email) {
            setReferrerEmail(data.email)
          }
        })
        .catch((err) => {
          console.error("Error looking up referral code:", err)
        })
        .finally(() => {
          setIsLookingUpReferral(false)
        })
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsAccepted) {
      setError("You must accept the Terms & Conditions")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const user = await register(name, email, password, referrerEmail)
      if (user) {
        router.push("/verify-email")
      }
    } catch (error: any) {
      setError(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-[#1c1e26] rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Peer-2-Peer Wealth Creation!</h1>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500 text-red-300 rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="referrerEmail" className="text-gray-300">
            Referrer's Email Address
          </Label>
          <Input
            id="referrerEmail"
            type="email"
            value={referrerEmail}
            onChange={(e) => setReferrerEmail(e.target.value)}
            className="bg-[#2a2d3a] border-gray-700 text-white"
            disabled={!!referralCode}
            readOnly={!!referralCode}
          />
          {isLookingUpReferral && (
            <div className="text-xs text-gray-400 flex items-center">
              <Loader2 className="animate-spin h-3 w-3 mr-2" />
              Looking up referrer...
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="text-gray-300">
            Country
          </Label>
          <CountryCombobox onSelect={setCountry} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300">
            Your Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-[#2a2d3a] border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">
            Your email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#2a2d3a] border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-[#2a2d3a] border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-gray-300">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="bg-[#2a2d3a] border-gray-700 text-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
          >
            I have read and accept the Terms & Conditions
          </label>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            "Register"
          )}
        </Button>
      </form>

      <div className="text-center text-gray-400">OR</div>

      <div className="flex flex-col space-y-4">
        <button className="flex items-center justify-center space-x-2 p-2 border border-gray-700 rounded-md hover:bg-gray-800">
          <Image src="/apple-logo.png" alt="Apple" width={20} height={20} />
          <span className="text-white">Sign up with Apple</span>
        </button>

        <button className="flex items-center justify-center space-x-2 p-2 border border-gray-700 rounded-md hover:bg-gray-800">
          <Image src="/google-logo.png" alt="Google" width={20} height={20} />
          <span className="text-white">Sign up with Google</span>
        </button>
      </div>

      <div className="text-center">
        <a href="/login" className="text-blue-400 hover:underline">
          Already a Member - Sign in?
        </a>
      </div>
    </div>
  )
}
