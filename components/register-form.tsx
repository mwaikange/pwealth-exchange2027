"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { registerUser } from "@/actions/auth-actions"
import { useFormStatus } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"
import { CountryCombobox } from "./country-combobox"
import { Loader2 } from "lucide-react"

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

// Create a client component wrapper for the search params functionality
function ReferralCodeHandler({
  onReferralFound,
}: {
  onReferralFound: (email: string, code: string) => void
}) {
  const searchParams = useSearchParams()
  const [isLookingUp, setIsLookingUp] = useState(false)

  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref) {
      setIsLookingUp(true)

      fetch(`/api/referral/lookup?code=${ref}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to look up referral code")
          }
          return response.json()
        })
        .then((data) => {
          if (data.email) {
            onReferralFound(data.email, ref)
          }
        })
        .catch((err) => {
          console.error("Error looking up referral code:", err)
        })
        .finally(() => {
          setIsLookingUp(false)
        })
    }
  }, [searchParams, onReferralFound])

  return isLookingUp ? <Loader2 className="animate-spin h-4 w-4 text-gray-400" /> : null
}

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation function
function isValidPassword(password: string): boolean {
  // At least 8 characters, with at least one letter and one number
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [countryError, setCountryError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)

  const handleReferralFound = (email: string, code: string) => {
    setReferrerEmail(email)
    setReferralCode(code)
  }

  // Validate email when it changes
  useEffect(() => {
    if (email && !isValidEmail(email)) {
      setEmailError("Please enter a valid email address")
    } else {
      setEmailError(null)
    }
  }, [email])

  // Validate password when it changes
  useEffect(() => {
    if (password && !isValidPassword(password)) {
      setPasswordError("Password must be at least 8 characters with at least one letter and one number")
    } else {
      setPasswordError(null)
    }
  }, [password])

  // Check if passwords match when either changes
  useEffect(() => {
    if (password && confirmPassword) {
      setPasswordsMatch(password === confirmPassword)
    }
  }, [password, confirmPassword])

  async function handleSubmit(formData: FormData) {
    // Reset all errors
    setError(null)
    setCountryError(null)
    setEmailError(null)
    setPasswordError(null)
    setTermsError(null)

    // Validate email
    if (!email || !isValidEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    // Validate password
    if (!password || !isValidPassword(password)) {
      setPasswordError("Password must be at least 8 characters with at least one letter and one number")
      return
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setPasswordsMatch(false)
      return
    }

    // Check if country is selected
    if (!country) {
      setCountryError("Please select your country")
      return
    }

    // Check if terms are accepted
    if (!termsAccepted) {
      setTermsError("You must accept the Terms & Conditions")
      return
    }

    setIsSubmitting(true)

    try {
      // Include country and referrerEmail with the other form values
      const formDataWithExtras = new FormData()
      formDataWithExtras.append("email", email)
      formDataWithExtras.append("password", password)
      formDataWithExtras.append("country", country) // Country is required

      // Only include referrerEmail if it's provided
      if (referrerEmail) {
        formDataWithExtras.append("referrerEmail", referrerEmail)
      }

      console.log("Submitting registration with data:", {
        email,
        country,
        referrerEmail: referrerEmail || "None provided",
        passwordLength: password.length,
      })

      const result = await registerUser(formDataWithExtras)

      if (result.success) {
        // Redirect to verify email page with the email as a query parameter
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      } else {
        setError(result.message || "Registration failed. Please try again.")
      }
    } catch (err: any) {
      console.error("Registration error:", err)
      setError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
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

        {/* Referral code handler - this component uses useSearchParams */}
        <ReferralCodeHandler onReferralFound={handleReferralFound} />

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm">{error}</div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!isSubmitting) {
              handleSubmit(new FormData(e.currentTarget))
            }
          }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div className="relative">
              <input
                type="email"
                name="referrerEmail"
                placeholder="Referrer's Email Address (Optional)"
                value={referrerEmail}
                onChange={(e) => setReferrerEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none ${
                  referralCode ? "opacity-80" : ""
                }`}
                disabled={!!referralCode}
                readOnly={!!referralCode}
              />
              {referralCode && <p className="text-xs text-gray-400 mt-1 ml-4">Referral code applied: {referralCode}</p>}
            </div>

            <div className="relative">
              <CountryCombobox value={country} onChange={setCountry} placeholder="Country" required={true} />
              {countryError && <p className="text-red-500 text-xs mt-1 ml-4">{countryError}</p>}
            </div>

            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none ${
                  emailError ? "border border-red-500" : ""
                }`}
                required
              />
              {emailError && <p className="text-red-500 text-xs mt-1 ml-4">{emailError}</p>}
            </div>

            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none ${
                  passwordError ? "border border-red-500" : ""
                }`}
                required
              />
              {passwordError && <p className="text-red-500 text-xs mt-1 ml-4">{passwordError}</p>}
            </div>

            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-[#3a3d4a] rounded-full text-white placeholder-gray-400 focus:outline-none ${
                  !passwordsMatch && confirmPassword ? "border border-red-500" : ""
                }`}
                required
              />
              {!passwordsMatch && confirmPassword && (
                <p className="text-red-500 text-xs mt-1 ml-4">Passwords do not match</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="terms"
              name="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="rounded border-gray-600 bg-[#3a3d4a] text-[#fff27a] focus:ring-[#fff27a]"
              required
            />
            <label htmlFor="terms" className="text-white text-sm">
              I have read and accept the Terms & Conditions
            </label>
          </div>
          {termsError && <p className="text-red-500 text-xs">{termsError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors disabled:opacity-70"
          >
            {isSubmitting ? "Registering..." : "Register"}
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
