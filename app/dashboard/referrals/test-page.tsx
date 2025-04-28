"use client"

import { useState, useEffect } from "react"
import { determineButtonState, type ButtonState } from "@/utils/button-state"

// Mock data for testing
const mockReferralData = [
  // User 1 - Level 1 (duplicate entries with same level)
  {
    referral_id: "ref-1-1-a",
    referred_uuid: "user-1",
    referred_email: "user1@example.com",
    referral_date: "2023-01-01T00:00:00Z",
    referred_referral_code: "REF001",
    claimed: false,
    claim_date: null,
    country: "USA",
    status: "active",
    level: "1",
    active_count: 3,
    invested_schedules_count: 3,
  },
  {
    referral_id: "ref-1-1-b",
    referred_uuid: "user-1",
    referred_email: "user1@example.com",
    referral_date: "2023-01-01T00:00:00Z",
    referred_referral_code: "REF001",
    claimed: false,
    claim_date: null,
    country: "USA",
    status: "active",
    level: "1",
    active_count: 3,
    invested_schedules_count: 3,
  },

  // User 1 - Level 2
  {
    referral_id: "ref-1-2",
    referred_uuid: "user-1",
    referred_email: "user1@example.com",
    referral_date: "2023-01-01T00:00:00Z",
    referred_referral_code: "REF001",
    claimed: false,
    claim_date: null,
    country: "USA",
    status: "active",
    level: "2",
    active_count: 2,
    invested_schedules_count: 2,
  },

  // User 1 - Level 3
  {
    referral_id: "ref-1-3",
    referred_uuid: "user-1",
    referred_email: "user1@example.com",
    referral_date: "2023-01-01T00:00:00Z",
    referred_referral_code: "REF001",
    claimed: false,
    claim_date: null,
    country: "USA",
    status: "active",
    level: "3",
    active_count: 1,
    invested_schedules_count: 1,
  },

  // User 2 - Level 1 (duplicate entries with same level)
  {
    referral_id: "ref-2-1-a",
    referred_uuid: "user-2",
    referred_email: "user2@example.com",
    referral_date: "2023-02-01T00:00:00Z",
    referred_referral_code: "REF002",
    claimed: true,
    claim_date: "2023-02-15T00:00:00Z",
    country: "Canada",
    status: "active",
    level: "1",
    active_count: 5,
    invested_schedules_count: 5,
  },
  {
    referral_id: "ref-2-1-b",
    referred_uuid: "user-2",
    referred_email: "user2@example.com",
    referral_date: "2023-02-01T00:00:00Z",
    referred_referral_code: "REF002",
    claimed: true,
    claim_date: "2023-02-15T00:00:00Z",
    country: "Canada",
    status: "active",
    level: "1",
    active_count: 5,
    invested_schedules_count: 5,
  },

  // User 2 - Level 2
  {
    referral_id: "ref-2-2",
    referred_uuid: "user-2",
    referred_email: "user2@example.com",
    referral_date: "2023-02-01T00:00:00Z",
    referred_referral_code: "REF002",
    claimed: false,
    claim_date: null,
    country: "Canada",
    status: "active",
    level: "2",
    active_count: 4,
    invested_schedules_count: 4,
  },

  // User 2 - Level 3
  {
    referral_id: "ref-2-3",
    referred_uuid: "user-2",
    referred_email: "user2@example.com",
    referral_date: "2023-02-01T00:00:00Z",
    referred_referral_code: "REF002",
    claimed: false,
    claim_date: null,
    country: "Canada",
    status: "active",
    level: "3",
    active_count: 3,
    invested_schedules_count: 3,
  },

  // User 3 - Level 1 (multiple entries with same level)
  {
    referral_id: "ref-3-1-a",
    referred_uuid: "user-3",
    referred_email: "user3@example.com",
    referral_date: "2023-03-01T00:00:00Z",
    referred_referral_code: "REF003",
    claimed: false,
    claim_date: null,
    country: "UK",
    status: "pending",
    level: "1",
    active_count: 0,
    invested_schedules_count: 0,
  },
  {
    referral_id: "ref-3-1-b",
    referred_uuid: "user-3",
    referred_email: "user3@example.com",
    referral_date: "2023-03-01T00:00:00Z",
    referred_referral_code: "REF003",
    claimed: false,
    claim_date: null,
    country: "UK",
    status: "pending",
    level: "1",
    active_count: 0,
    invested_schedules_count: 0,
  },
  {
    referral_id: "ref-3-1-c",
    referred_uuid: "user-3",
    referred_email: "user3@example.com",
    referral_date: "2023-03-01T00:00:00Z",
    referred_referral_code: "REF003",
    claimed: false,
    claim_date: null,
    country: "UK",
    status: "pending",
    level: "1",
    active_count: 0,
    invested_schedules_count: 0,
  },
]

interface FormattedReferral {
  referralId: string
  referralCode: string
  email: string
  country: string
  status: string
  level: string
  progress: string
  claimStatus: "claimed" | "eligible" | "pending"
  registerDate: string
  referredUuid: string
  activeCount: number
  investedSchedulesCount: number
  buttonState?: ButtonState
  claimed: boolean
  claim_date: string | null
  level_reset?: boolean
}

export default function TestReferralsPage() {
  const [processedData, setProcessedData] = useState<FormattedReferral[]>([])
  const [deduplicatedData, setDeduplicatedData] = useState<FormattedReferral[]>([])

  useEffect(() => {
    // Process the mock data
    const processed = mockReferralData.map((ref) => {
      const activeCount = Math.min(ref.active_count ?? 0, 5)

      // Determine button state
      const buttonState = determineButtonState({
        active_count: activeCount,
        claimed: ref.claimed,
        claim_date: ref.claim_date,
        level_reset: false,
      })

      // Map button_state to claimStatus
      let claimStatus: "claimed" | "eligible" | "pending" = "pending"
      if (buttonState.button_state === "claimed") {
        claimStatus = "claimed"
      } else if (buttonState.button_state === "claimable") {
        claimStatus = "eligible"
      }

      return {
        referralId: ref.referral_id,
        referralCode: ref.referred_referral_code || "Unknown",
        email: ref.referred_email || "Unknown",
        country: ref.country || "Unknown",
        status: ref.status || "pending",
        level: ref.level || "1",
        progress: buttonState.progress_text,
        claimStatus,
        registerDate: new Date(ref.referral_date).toLocaleDateString(),
        referredUuid: ref.referred_uuid,
        activeCount,
        investedSchedulesCount: Math.min(ref.invested_schedules_count ?? 0, 5),
        buttonState,
        claimed: ref.claimed,
        claim_date: ref.claim_date,
        level_reset: false,
      }
    })

    setProcessedData(processed)

    // Create a map to store unique referrals by user and level
    const uniqueReferrals = new Map<string, FormattedReferral>()

    // Process referrals to ensure one entry per user per level
    processed.forEach((referral) => {
      const key = `${referral.referredUuid}-${referral.level}`

      // Only add if this user+level combination doesn't exist yet
      if (!uniqueReferrals.has(key)) {
        uniqueReferrals.set(key, referral)
      }
    })

    // Convert map back to array
    const deduplicated = Array.from(uniqueReferrals.values())
    setDeduplicatedData(deduplicated)
  }, [])

  return (
    <div className="p-6 bg-[#1c1e26] min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Referrals Deduplication Test</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Original Data ({processedData.length} entries)</h2>
        <div className="bg-[#2a2d3a] rounded-lg p-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-sm font-medium">User ID</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Referral ID</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Level</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Status</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((ref, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2 px-4 text-sm">{ref.referredUuid}</td>
                  <td className="py-2 px-4 text-sm">{ref.referralId}</td>
                  <td className="py-2 px-4 text-sm">{ref.level}</td>
                  <td className="py-2 px-4 text-sm">{ref.status}</td>
                  <td className="py-2 px-4 text-sm">{ref.progress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Deduplicated Data ({deduplicatedData.length} entries)</h2>
        <div className="bg-[#2a2d3a] rounded-lg p-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-sm font-medium">User ID</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Referral ID</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Level</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Status</th>
                <th className="text-left py-2 px-4 text-sm font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {deduplicatedData.map((ref, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2 px-4 text-sm">{ref.referredUuid}</td>
                  <td className="py-2 px-4 text-sm">{ref.referralId}</td>
                  <td className="py-2 px-4 text-sm">{ref.level}</td>
                  <td className="py-2 px-4 text-sm">{ref.status}</td>
                  <td className="py-2 px-4 text-sm">{ref.progress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Original data: {processedData.length} entries</li>
            <li>Deduplicated data: {deduplicatedData.length} entries</li>
            <li>User count: {new Set(deduplicatedData.map((r) => r.referredUuid)).size}</li>
            <li>Expected entries per user: 3 (one for each level)</li>
            <li>
              Actual entries per user:{" "}
              {deduplicatedData.length / (new Set(deduplicatedData.map((r) => r.referredUuid)).size || 1)}
            </li>
            <li className="font-bold">
              {deduplicatedData.length / (new Set(deduplicatedData.map((r) => r.referredUuid)).size || 1) === 3
                ? "✅ TEST PASSED: Each user has exactly 3 entries (one per level)"
                : "❌ TEST FAILED: Users don't have exactly 3 entries each"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
