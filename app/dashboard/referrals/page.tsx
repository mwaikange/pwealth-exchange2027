"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"
import { determineButtonState, type ButtonState } from "@/utils/button-state"

// Define the type for referral data from the view
interface ReferralViewData {
  referral_id: string
  referred_uuid: string
  referred_email: string
  referral_date: string
  referred_referral_code: string
  claimed: boolean
  claim_date: string | null
  country: string
  status: string
  level: number
  active_count: number
  invested_schedules_count: number
  referrer_uuid: string
}

// Define the type for level progress data
interface LevelProgressData {
  user_uuid: string
  level: number
  progress: string
}

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
  buttonState?: ButtonState
  claimed: boolean
  claim_date: string | null
}

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [referralData, setReferralData] = useState<FormattedReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const router = useRouter()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()
  const [claimingReferralId, setClaimingReferralId] = useState<string | null>(null)

  // Helper function to extract numeric progress value from string
  const extractProgressValue = (progressString: string): number => {
    if (!progressString) return 0

    // Try to extract the number before the slash
    const match = progressString.match(/^(\d+)\//)
    if (match && match[1]) {
      return Number.parseInt(match[1], 10)
    }

    // If no match, try to parse the whole string as a number
    const numValue = Number.parseInt(progressString, 10)
    return isNaN(numValue) ? 0 : numValue
  }

  // Fetch referral data from Supabase
  const fetchReferrals = async () => {
    if (!user) return

    setLoading(true)
    const supabase = createClientComponentClient()

    try {
      // Step 1: Fetch from the referral_view
      const { data: referralViewData, error: referralViewError } = await supabase
        .from("referral_view")
        .select("*")
        .eq("referrer_uuid", user.id)

      if (referralViewError) {
        console.error("Error fetching referrals:", referralViewError)
        setReferralData([])
        setLoading(false)
        return
      }

      console.log("Referral view data:", referralViewData)

      if (!referralViewData || referralViewData.length === 0) {
        console.log("No referrals found in referral_view")
        setReferralData([])
        setLoading(false)
        return
      }

      // Process each referral and fetch its progress
      const processedData = await Promise.all(
        referralViewData.map(async (ref: ReferralViewData) => {
          // Query the levels table for this specific user's progress
          const { data: levelsData, error: levelsError } = await supabase
            .from("levels")
            .select("progress")
            .eq("user_uuid", ref.referred_uuid)
            .eq("level", ref.level)
            .limit(1)

          if (levelsError) {
            console.error(`Error fetching progress for user ${ref.referred_uuid}:`, levelsError)
          }

          // Get the progress value (default to "0/5" if not found)
          const progress = levelsData && levelsData.length > 0 ? levelsData[0].progress : "0/5"

          // Extract numeric value from progress string
          const activeCount = extractProgressValue(progress)

          // Determine button state using our utility function
          const buttonState = determineButtonState({
            active_count: activeCount,
            claimed: ref.claimed,
            claim_date: ref.claim_date,
            level_reset: false,
          })

          // Map button_state to claimStatus for backward compatibility
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
            level: String(ref.level || "1"),
            progress: progress,
            claimStatus,
            registerDate: ref.referral_date ? format(new Date(ref.referral_date), "dd MMM, h:mm a") : "Unknown",
            referredUuid: ref.referred_uuid,
            activeCount,
            buttonState,
            claimed: ref.claimed,
            claim_date: ref.claim_date,
          }
        }),
      )

      setReferralData(processedData)
      setLoading(false)
    } catch (err) {
      console.error("Error in fetchReferrals:", err)
      setReferralData([])
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchReferrals()
  }, [user])

  // Set up a polling interval to refresh data
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchReferrals()
    }, 30000) // Check every 30 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [user])

  // Filter referrals based on active filter and search query
  const filteredReferrals = referralData.filter((referral) => {
    // Filter by claim status
    if (
      (activeFilter === "Claimed" && referral.claimStatus !== "claimed") ||
      (activeFilter === "Not Claimed" && referral.claimStatus === "claimed")
    ) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        referral.referralCode?.toLowerCase().includes(query) ||
        referral.country?.toLowerCase().includes(query) ||
        referral.email?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Create a map to store unique referrals by user and level
  const uniqueReferrals = new Map<string, FormattedReferral>()

  // Process referrals to ensure one entry per user per level
  filteredReferrals.forEach((referral) => {
    const key = `${referral.referredUuid}-${referral.level}`

    // Only add if this user+level combination doesn't exist yet
    if (!uniqueReferrals.has(key)) {
      uniqueReferrals.set(key, referral)
    }
  })

  // Convert map back to array
  const deduplicatedReferrals = Array.from(uniqueReferrals.values())

  // Handle claim button click
  const handleClaim = async (referralId: string, level: string) => {
    if (!user || !referralId) return

    setClaimingReferralId(referralId)

    try {
      // Award 1 PWT for all levels
      const pwtAmount = 1 // Fixed at 1 PWT for all levels

      // Update the database to mark the referral as claimed
      const supabase = createClientComponentClient()
      const { error } = await supabase
        .from("referrals")
        .update({
          claimed: true,
          claim_date: new Date().toISOString(),
        })
        .eq("referral_id", referralId)

      if (error) {
        console.error("Error updating referral:", error)
        setClaimSuccess("Failed to claim referral. Please try again.")
        setTimeout(() => setClaimSuccess(""), 3000)
        setClaimingReferralId(null)
        return
      }

      // Add to cashout balance
      await claimToPwtCashout(pwtAmount)

      // Log the transaction
      await addTransaction({
        type: "REFERRAL CLAIM",
        account: "PWT Cashout",
        amount: pwtAmount,
        amountUsd: pwtAmount * 10,
        description: `REFERRAL CLAIM - Level ${level}`,
      })

      // Show success message
      setClaimSuccess(`Successfully claimed ${pwtAmount} PWT from referral (Level ${level})`)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setClaimSuccess("")
      }, 3000)

      // Refresh the data to get the latest state
      fetchReferrals()
      setClaimingReferralId(null)
    } catch (error) {
      console.error("Error in claim process:", error)
      setClaimSuccess("An error occurred during the claim process.")
      setTimeout(() => setClaimSuccess(""), 3000)
      setClaimingReferralId(null)
    }
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-gray-400 text-sm">Claim your referral earnings once your referral has completed Level 1</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ID or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#2a2d3a] border border-gray-700 rounded-md py-1 px-3 pr-8 text-sm w-48"
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium"
          >
            Copy Referral Code
          </button>
        </div>
      </div>

      {/* Success message */}
      {claimSuccess && <div className="mx-6 mb-2 p-2 bg-green-500 text-white text-sm rounded">{claimSuccess}</div>}

      {/* Referrals Table */}
      <div className="px-6 mt-2">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          {/* Filter Tabs */}
          <div className="flex justify-center py-3">
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                onClick={() => setActiveFilter("All")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "All" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("Claimed")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Claimed" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Claimed
              </button>
              <button
                onClick={() => setActiveFilter("Not Claimed")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Not Claimed" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Not Claimed
              </button>
            </div>
          </div>

          {/* Table with fixed header and scrollable body */}
          <div className="relative">
            {/* Fixed Header */}
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-700 bg-[#1c1e26]">
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[20%]">Referral Code</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Country</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[10%]">Status</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[10%]">Level</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Progress</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Register Date</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Claim</th>
                </tr>
              </thead>
            </table>

            {/* Scrollable Body */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {loading ? (
                <div className="p-4 text-center">Loading referrals...</div>
              ) : deduplicatedReferrals.length === 0 ? (
                <div className="p-4 text-center">
                  No referrals found
                  {process.env.NODE_ENV === "development" && (
                    <div className="text-xs text-gray-500 mt-2">Check the debug info above for more details</div>
                  )}
                </div>
              ) : (
                <table className="w-full table-fixed">
                  <tbody>
                    {deduplicatedReferrals.map((referral, index) => renderReferralRow(referral, index.toString()))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Helper function to render a referral row
  function renderReferralRow(referral: FormattedReferral, key: string) {
    // Use button state from our utility function
    const buttonState =
      referral.buttonState ||
      determineButtonState({
        active_count: referral.activeCount,
        claimed: referral.claimed,
        claim_date: referral.claim_date,
        level_reset: false, // We're not using level reset anymore
      })

    // Determine button appearance and behavior based on button state
    const buttonAppearance = {
      text: buttonState.button_text,
      bgColor:
        buttonState.button_color === "white"
          ? "bg-white"
          : buttonState.button_color === "grey"
            ? "bg-gray-500"
            : buttonState.button_color === "red"
              ? "bg-red-500"
              : "bg-gray-500",
      textColor:
        buttonState.text_color === "white"
          ? "text-white"
          : buttonState.text_color === "black"
            ? "text-black"
            : buttonState.text_color === "green"
              ? "text-green-400"
              : "text-white",
      isClickable: buttonState.is_clickable,
      additionalClasses: buttonState.is_clickable ? "hover:bg-gray-100" : "cursor-not-allowed opacity-70",
    }

    // Override text if currently claiming
    if (claimingReferralId === referral.referralId) {
      buttonAppearance.text = "..."
      buttonAppearance.bgColor = "bg-gray-400"
      buttonAppearance.textColor = "text-gray-800"
      buttonAppearance.isClickable = false
      buttonAppearance.additionalClasses = ""
    }

    return (
      <tr key={key} className="border-b border-gray-700">
        <td className="py-[6px] px-4 text-[10px] w-[20%]">{referral.referralCode}</td>
        <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.country}</td>
        <td className="py-[6px] px-4 text-[10px] w-[10%]">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] ${
              referral.status.toLowerCase() === "active"
                ? "bg-green-500/20 text-green-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {referral.status}
          </span>
        </td>
        <td className="py-[6px] px-4 text-[10px] w-[10%]">{referral.level}</td>
        <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.progress}</td>
        <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.registerDate}</td>
        <td className="py-[6px] px-4 text-[10px] w-[15%]">
          <button
            onClick={() => buttonAppearance.isClickable && handleClaim(referral.referralId, referral.level)}
            disabled={!buttonAppearance.isClickable}
            className={`${buttonAppearance.bgColor} ${buttonAppearance.textColor} px-4 py-1 rounded text-[10px] w-16 transition-colors ${buttonAppearance.additionalClasses}`}
          >
            {buttonAppearance.text}
          </button>
        </td>
      </tr>
    )
  }
}
