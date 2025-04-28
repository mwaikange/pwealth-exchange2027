"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

interface ReferralLookupProps {
  onReferrerFound: (email: string) => void
}

export function ReferralLookup({ onReferrerFound }: ReferralLookupProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const referralCode = searchParams.get("ref")

  useEffect(() => {
    async function lookupReferralCode() {
      if (!referralCode) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/referral/lookup?code=${referralCode}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to lookup referral code")
        }

        const data = await response.json()
        if (data.email) {
          onReferrerFound(data.email)
        }
      } catch (err) {
        console.error("Error looking up referral code:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    lookupReferralCode()
  }, [referralCode, onReferrerFound])

  // This component doesn't render anything visible
  return null
}
