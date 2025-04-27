"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"

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
  level: string
  active_count: number
  invested_schedules_count: number
}

// Define the type for button state data from the SQL function
interface ButtonStateData {
  button_state: string
  button_text: string
  button_color: string
  text_color: string
  is_clickable: boolean
  progress_text: string
  reset_timer_seconds: number
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
  investedSchedulesCount: number
  buttonState?: ButtonStateData
}

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [referralData, setReferralData] = useState<FormattedReferral[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()
  const [claimingReferralId, setClaimingReferralId] = useState<string | null>(null)
  const [resetTimers, setResetTimers] = useState<Record<string, NodeJS.Timeout>>({})

  // Fetch referral data from Supabase
  const fetchReferrals = async () => {
    if (!user) return

    setLoading(true)
    const supabase = createClientComponentClient()

    // Fetch from the referral_view
    const { data, error } = await supabase.from("referral_view").select("*").eq("referrer_uuid", user.id)

    if (error) {
      console.error("Error fetching referrals:", error)
      setReferralData([])
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setReferralData([])
      setLoading(false)
      return
    }

    // Get button states for all referrals
    const referralIds = data.map((ref: ReferralViewData) => ref.referral_id)
    const buttonStates: Record<string, ButtonStateData> = {}

    // Fetch button states for each referral
    for (const refId of referralIds) {
      const { data: buttonData, error: buttonError } = await supabase.rpc("get_referral_button_state", {
        p_referral_id: refId,
      })

      if (buttonError) {
        console.error(`Error fetching button state for referral ${refId}:`, buttonError)
        continue
      }

      if (buttonData && buttonData.length > 0) {
        buttonStates[refId] = buttonData[0]

        // Set up reset timer if needed
        if (buttonData[0].reset_timer_seconds > 0) {
          // Clear existing timer if any
          if (resetTimers[refId]) {
            clearTimeout(resetTimers[refId])
          }

          // Set new timer
          const timerId = setTimeout(() => {
            fetchReferrals() // Refresh data when timer expires
          }, buttonData[0].reset_timer_seconds * 1000)

          setResetTimers((prev) => ({
            ...prev,
            [refId]: timerId,
          }))
        }
      }
    }

    // Transform the data to match our UI needs
    const transformedData = data.map((ref: ReferralViewData) => {
      const buttonState = buttonStates[ref.referral_id]

      // Map button_state to claimStatus for backward compatibility
      let claimStatus: "claimed" | "eligible" | "pending" = "pending"
      if (buttonState) {
        if (buttonState.button_state === "claimed") {
          claimStatus = "claimed"
        } else if (buttonState.button_state === "claimable") {
          claimStatus = "eligible"
        }
      } else {
        // Fallback to old logic if button state not available
        claimStatus = ref.claimed ? "claimed" : ref.active_count >= 5 ? "eligible" : "pending"
      }

      // Ensure progress never exceeds 5/5
      const activeCount = Math.min(ref.active_count ?? 0, 5)
      const progressText = buttonState ? buttonState.progress_text : `${activeCount}/5`

      return {
        referralId: ref.referral_id,
        referralCode: ref.referred_referral_code || ref.referral_id || "Unknown",
        email: ref.referred_email || "Unknown",
        country: ref.country || "Unknown",
        status: ref.status || "pending",
        level: ref.level || "1",
        progress: progressText,
        claimStatus,
        registerDate: ref.referral_date ? format(new Date(ref.referral_date), "dd MMM, h:mm a") : "Unknown",
        referredUuid: ref.referred_uuid,
        activeCount: activeCount,
        investedSchedulesCount: Math.min(ref.invested_schedules_count ?? 0, 5),
        buttonState,
      }
    })

    setReferralData(transformedData)
    setLoading(false)
  }

  // Initial fetch
  useEffect(() => {
    fetchReferrals()
  }, [user])

  // Set up a polling interval to check for level resets
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchReferrals()
    }, 30000) // Check every 30 seconds

    return () => {
      clearInterval(intervalId)
      // Clear all reset timers
      Object.values(resetTimers).forEach((timerId) => clearTimeout(timerId))
    }
  }, [user, resetTimers])

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

  // Group referrals by referred_uuid to avoid duplication
  const groupedReferrals = filteredReferrals.reduce(
    (acc, referral) => {
      const key = referral.referredUuid
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(referral)
      return acc
    },
    {} as Record<string, FormattedReferral[]>,
  )

  // Handle claim button click
  const handleClaim = async (referralId: string, level: string) => {
    if (!user) return

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
              ) : Object.values(groupedReferrals).length === 0 ? (
                <div className="p-4 text-center">No referrals found</div>
              ) : (
                <table className="w-full table-fixed">
                  <tbody>
                    {Object.values(groupedReferrals).flatMap((referrals, index) => {
                      // Get the first referral in the group
                      const firstReferral = referrals[0]

                      // If status is active, create 3 rows (one for each level)
                      if (firstReferral.status.toLowerCase() === "active") {
                        const rows = []
                        for (let level = 1; level <= 3; level++) {
                          // Find if there's already a referral with this level
                          const existingReferral = referrals.find((r) => r.level === String(level))

                          // Use existing referral or create a new one based on the first referral
                          const levelReferral = existingReferral || {
                            ...firstReferral,
                            level: String(level),
                            referralId: `${firstReferral.referralId}-${level}`,
                            originalReferralId: firstReferral.referralId,
                          }

                          rows.push(levelReferral)
                        }
                        return rows.map((row, subIndex) => renderReferralRow(row, `${index}-${subIndex}`, true))
                      } else {
                        // For non-active status, just display one row per referral
                        return referrals.map((referral, subIndex) =>
                          renderReferralRow(referral, `${index}-${subIndex}`, false),
                        )
                      }
                    })}
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
  function renderReferralRow(referral: FormattedReferral, key: string, isActiveSubrow = false) {
    // Use button state from SQL function if available
    const buttonState = referral.buttonState

    // Determine button appearance and behavior based on button state
    let buttonAppearance = {
      text: "locked",
      bgColor: "bg-gray-500",
      textColor: "text-white",
      isClickable: false,
      additionalClasses: "cursor-not-allowed opacity-70",
    }

    if (buttonState) {
      // Use button state from SQL function
      switch (buttonState.button_state) {
        case "locked":
          buttonAppearance = {
            text: buttonState.button_text,
            bgColor: "bg-gray-500",
            textColor: "text-white",
            isClickable: false,
            additionalClasses: "cursor-not-allowed opacity-70",
          }
          break
        case "claimable":
          buttonAppearance = {
            text: buttonState.button_text,
            bgColor: "bg-white",
            textColor: "text-black",
            isClickable: true,
            additionalClasses: "hover:bg-gray-100",
          }
          break
        case "claimed":
          buttonAppearance = {
            text: buttonState.button_text,
            bgColor: "bg-gray-700",
            textColor: "text-green-400",
            isClickable: false,
            additionalClasses: "cursor-not-allowed",
          }
          break
        default:
          // Fallback to default
          break
      }
    } else {
      // Fallback to old logic if button state not available
      const oldButtonState =
        referral.claimStatus === "claimed" ? "claimed" : referral.activeCount >= 5 ? "eligible" : "locked"

      switch (oldButtonState) {
        case "locked":
          buttonAppearance = {
            text: "locked",
            bgColor: "bg-gray-500",
            textColor: "text-white",
            isClickable: false,
            additionalClasses: "cursor-not-allowed opacity-70",
          }
          break
        case "eligible":
          buttonAppearance = {
            text: "claim",
            bgColor: "bg-white",
            textColor: "text-black",
            isClickable: true,
            additionalClasses: "hover:bg-gray-100",
          }
          break
        case "claimed":
          buttonAppearance = {
            text: "claimed",
            bgColor: "bg-gray-700",
            textColor: "text-green-400",
            isClickable: false,
            additionalClasses: "cursor-not-allowed",
          }
          break
      }
    }

    // Override text if currently claiming
    if (claimingReferralId === (referral.originalReferralId || referral.referralId)) {
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
            onClick={() =>
              buttonAppearance.isClickable &&
              handleClaim(referral.originalReferralId || referral.referralId, referral.level)
            }
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
