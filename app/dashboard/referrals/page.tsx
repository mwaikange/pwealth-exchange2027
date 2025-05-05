"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { format } from "date-fns"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Define the type for referral data
interface FormattedReferral {
  referredUuid: string
  level: string
  investedCount: number
  progress: string
  referralUuid: string
  referralCode: string
  referredReferralCode: string
  country: string
  status: string
  registerDate: string
  buttonState: "Locked" | "claimable" | "claimed"
  autoClaimedStatus?: boolean
}

// Group type for organizing referrals by code
interface ReferralGroup {
  referralCode: string
  referrals: FormattedReferral[]
}

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [referralData, setReferralData] = useState<FormattedReferral[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false) // Separate state for background refreshes
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [claimingReferral, setClaimingReferral] = useState<{ id: string; level: string } | null>(null)
  const [claimSuccess, setClaimSuccess] = useState("")
  const router = useRouter()
  const { user } = useAuth()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()

  // Fetch referral data from Supabase
  const fetchReferrals = async (retry = 0, isBackgroundRefresh = false) => {
    if (!user) {
      console.log("No user found, skipping fetch")
      setLoading(false)
      setRefreshing(false)
      return
    }

    // Only set loading to true for initial loads, not background refreshes
    if (!isBackgroundRefresh) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    setError(null)

    try {
      console.log(`Fetching referrals for user: ${user.id} (Attempt ${retry + 1})`)

      const supabase = createClientComponentClient<Database>()

      // Log the current user ID for debugging
      console.log("Current user ID:", user.id)

      // Query the progression_levels_new view for the current user's referrals
      const { data, error: fetchError } = await supabase
        .from("progression_levels_new") // Use the new view
        .select(`
          referred_uuid,
          level_1,
          level_2,
          level_3,
          referral_uuid,
          button_state_lvl_1,
          button_state_lvl_2,
          button_state_lvl_3,
          auto_claimed_lvl_1,
          auto_claimed_lvl_2,
          auto_claimed_lvl_3
        `)
        .eq("referral_uuid", user.id)

      if (fetchError) {
        console.error("Error fetching referrals:", fetchError)
        throw new Error(`Failed to fetch referrals: ${fetchError.message}`)
      }

      console.log("Raw referrals data:", data)

      if (!data || data.length === 0) {
        console.log("No referrals found for this user")
        setReferralData([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Process the data - transform the flat structure into level-specific entries
      const processedData: FormattedReferral[] = []

      // For each referral, create up to 3 entries (one for each level)
      for (const item of data) {
        // Get additional info for this referral
        const { data: userData } = await supabase
          .from("app_users")
          .select("country, referral_code, created_at")
          .eq("user_uuid", item.referred_uuid)
          .single()

        const country = userData?.country || "Unknown"
        const referralCode = userData?.referral_code || "Unknown"
        const registerDate = userData?.created_at ? format(new Date(userData.created_at), "dd MMM, h:mm a") : "Unknown"

        // Process level 1
        if (item.level_1 !== null) {
          const investedCount = Number.parseInt(item.level_1.split("/")[0])
          const status = investedCount > 0 ? "active" : "inactive"

          processedData.push({
            referredUuid: item.referred_uuid,
            level: "1",
            investedCount,
            progress: item.level_1,
            referralUuid: item.referral_uuid,
            referralCode,
            referredReferralCode: referralCode,
            country,
            status,
            registerDate,
            buttonState: item.button_state_lvl_1 as "Locked" | "claimable" | "claimed",
            autoClaimedStatus: item.auto_claimed_lvl_1 || false,
          })
        }

        // Process level 2
        if (item.level_2 !== null) {
          const investedCount = Number.parseInt(item.level_2.split("/")[0])
          const status = investedCount > 0 ? "active" : "inactive"

          processedData.push({
            referredUuid: item.referred_uuid,
            level: "2",
            investedCount,
            progress: item.level_2,
            referralUuid: item.referral_uuid,
            referralCode,
            referredReferralCode: referralCode,
            country,
            status,
            registerDate,
            buttonState: item.button_state_lvl_2 as "Locked" | "claimable" | "claimed",
            autoClaimedStatus: item.auto_claimed_lvl_2 || false,
          })
        }

        // Process level 3
        if (item.level_3 !== null) {
          const investedCount = Number.parseInt(item.level_3.split("/")[0])
          const status = investedCount > 0 ? "active" : "inactive"

          processedData.push({
            referredUuid: item.referred_uuid,
            level: "3",
            investedCount,
            progress: item.level_3,
            referralUuid: item.referral_uuid,
            referralCode,
            referredReferralCode: referralCode,
            country,
            status,
            registerDate,
            buttonState: item.button_state_lvl_3 as "Locked" | "claimable" | "claimed",
            autoClaimedStatus: item.auto_claimed_lvl_3 || false,
          })
        }
      }

      console.log("Processed data:", processedData.length, "records")
      setReferralData(processedData)

      // Log button states after processing
      console.log(
        "Button states after processing:",
        processedData.map((r) => ({
          referredUuid: r.referredUuid,
          level: r.level,
          buttonState: r.buttonState,
        })),
      )

      setLoading(false)
      setRefreshing(false)
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error("Error in fetchReferrals:", err)

      // If we haven't exceeded max retries, try again
      if (retry < 2) {
        console.log(`Retrying fetch (${retry + 1}/2)...`)
        setRetryCount(retry + 1)
        setTimeout(() => fetchReferrals(retry + 1, isBackgroundRefresh), 1000 * (retry + 1)) // Exponential backoff
        return
      }

      setError(`Connection error: ${err.message || "Failed to connect to the database"}`)
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Check if a referral has already been claimed
  const checkIfReferralClaimed = async (referredUuid: string, level: string) => {
    if (!user) return false

    try {
      const supabase = createClientComponentClient<Database>()

      // Query the referral_claims table
      const { data, error } = await supabase
        .from("referral_claims")
        .select("*")
        .eq("referred_uuid", referredUuid)
        .eq("level", level)
        .eq("claimed_by", user.id)
        .limit(1)

      if (error) {
        console.error("Error checking if referral claimed:", error)
        return false
      }

      return data && data.length > 0
    } catch (err) {
      console.error("Error in checkIfReferralClaimed:", err)
      return false
    }
  }

  // Record a referral claim in the database
  const recordReferralClaim = async (referredUuid: string, level: string) => {
    if (!user) return false

    try {
      console.log(`Recording claim for referral: ${referredUuid}, level: ${level}`)

      // Use direct Supabase insert as a fallback if the API approach fails
      const supabase = createClientComponentClient<Database>()

      const { error } = await supabase.from("referral_claims").insert({
        referred_uuid: referredUuid,
        level: Number(level),
        claimed_by: user.id,
      })

      if (error) {
        // If the error is about unique constraint, it means this referral was already claimed
        if (error.code === "23505") {
          console.log("This referral has already been claimed")
          return true // Consider it a success since it's already claimed
        }

        console.error("Error recording referral claim:", error)
        return false
      }

      console.log("Successfully recorded referral claim")
      return true
    } catch (err) {
      console.error("Error in recordReferralClaim:", err)
      return false
    }
  }

  // Handle claim button click
  const handleClaim = async (referredUuid: string, level: string, referralCode: string) => {
    if (!user || !referredUuid) return

    // Log which specific referral and level is being claimed
    console.log(`Processing claim for referral UUID: ${referredUuid}, level: ${level}`)

    setClaimingReferral({ id: referredUuid, level })

    try {
      // Check if already claimed first
      const alreadyClaimed = await checkIfReferralClaimed(referredUuid, level)

      if (alreadyClaimed) {
        console.log(`Referral ${referredUuid} level ${level} has already been claimed`)
        setClaimSuccess("This referral has already been claimed")

        // Update the local state to show the button as claimed - ONLY for this specific level
        setReferralData((prevData) =>
          prevData.map((referral) =>
            referral.referredUuid === referredUuid && referral.level === level
              ? { ...referral, buttonState: "claimed" }
              : referral,
          ),
        )

        setTimeout(() => {
          setClaimSuccess("")
        }, 3000)

        return
      }

      // Award tokens based on level
      const pwtAmount = Number(level) // Level 1 = 1 PWT, Level 2 = 2 PWT, Level 3 = 3 PWT

      console.log(`Claiming ${pwtAmount} PWT for level ${level} referral (${referralCode})`)

      // Add to cashout balance with verification
      try {
        console.log(`Adding ${pwtAmount} PWT to Cashout balance...`)
        await claimToPwtCashout(pwtAmount)
        console.log(`Successfully added ${pwtAmount} PWT to Cashout balance`)
      } catch (balanceError) {
        console.error(`Error adding tokens to balance: ${balanceError}`)
        throw new Error(`Failed to add tokens to your balance: ${balanceError.message || "Unknown error"}`)
      }

      // Record the claim in the database
      const claimRecorded = await recordReferralClaim(referredUuid, level)

      if (!claimRecorded) {
        console.warn("Could not record claim in database, but continuing with transaction")
      }

      // Log the transaction with a clearer level identifier
      try {
        // Ensure consistent format for transaction type and description
        const transactionType = `REFERRAL CLAIM-LvL${level}`
        const transaction = await addTransaction({
          type: transactionType as any,
          account: "PWT Cashout",
          amount: pwtAmount,
          amountUsd: pwtAmount * 10, // Assuming 1 PWT = $10 USD
          description: transactionType, // Use the same format for description
        })
        console.log("Transaction recorded:", transaction)
      } catch (txError) {
        console.error("Error recording transaction:", txError)
        // Continue execution even if transaction recording fails
      }

      // Update the local state to show the button as claimed - ONLY for this specific level
      setReferralData((prevData) =>
        prevData.map((referral) =>
          referral.referredUuid === referredUuid && referral.level === level
            ? { ...referral, buttonState: "claimed" }
            : referral,
        ),
      )

      // Show success message
      setClaimSuccess(`Successfully claimed ${pwtAmount} PWT from referral (Level ${level})`)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setClaimSuccess("")
      }, 3000)

      // Force a complete refresh to get the latest state from the database
      setTimeout(() => {
        fetchReferrals(0, false) // Full refresh, not background
      }, 1000)
    } catch (error: any) {
      console.error("Error in claim process:", error)
      setClaimSuccess(`An error occurred during the claim process: ${error.message || "Unknown error"}`)
      setTimeout(() => setClaimSuccess(""), 3000)
    } finally {
      setClaimingReferral(null)
    }
  }

  // Group referrals by referral code and sort by level
  const groupedReferrals = useMemo(() => {
    // Create a map to group referrals by referred referral code
    const referralMap = new Map<string, FormattedReferral[]>()

    referralData.forEach((referral) => {
      const code = referral.referredReferralCode || referral.referralCode
      if (!referralMap.has(code)) {
        referralMap.set(code, [])
      }
      referralMap.get(code)?.push(referral)
    })

    // Convert map to array and sort each group by level
    const groups: ReferralGroup[] = []
    referralMap.forEach((referrals, referralCode) => {
      // Sort referrals by level (1, 2, 3)
      const sortedReferrals = [...referrals].sort((a, b) => {
        return Number.parseInt(a.level) - Number.parseInt(b.level)
      })

      groups.push({
        referralCode,
        referrals: sortedReferrals,
      })
    })

    return groups
  }, [referralData])

  // Manual refresh handler
  const handleRefresh = () => {
    setRetryCount(0)
    fetchReferrals(0)
  }

  // Initial fetch with a slight delay to ensure user is fully loaded
  useEffect(() => {
    if (user) {
      console.log("User loaded, fetching referrals in 500ms")
      // Add a small delay to ensure user data is fully loaded
      const timer = setTimeout(() => {
        fetchReferrals()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [user])

  // Set up a polling interval to refresh data
  useEffect(() => {
    if (!user) return

    console.log("Setting up polling interval")
    const intervalId = setInterval(() => {
      console.log("Polling: refreshing referrals data")
      fetchReferrals(0, true) // Use background refresh for polling
    }, 30000) // Check every 30 seconds

    return () => {
      console.log("Clearing polling interval")
      clearInterval(intervalId)
    }
  }, [user])

  // Move this function up, before filteredReferralGroups
  // Get button properties based on button state
  const getButtonProps = (referral: FormattedReferral, isProcessing: boolean) => {
    if (isProcessing) {
      return {
        text: "...",
        className: "bg-gray-700 text-white cursor-not-allowed",
        disabled: true,
      }
    }

    switch (referral.buttonState) {
      case "claimed":
        // Check if this was auto-claimed
        const buttonText = referral.autoClaimedStatus ? "Auto-Claimed" : "Claimed"
        return {
          text: buttonText,
          className: "bg-gray-700 text-green-400 cursor-not-allowed",
          disabled: true,
        }
      case "claimable":
        return {
          text: "Claim",
          className: "bg-white text-black hover:bg-gray-200",
          disabled: false,
        }
      case "Locked":
      default:
        return {
          text: "Locked",
          className: "bg-gray-700 text-gray-400 cursor-not-allowed",
          disabled: true,
        }
    }
  }

  // Then keep the filteredReferralGroups useMemo hook as is
  // Filter referral groups based on active filter and search query
  const filteredReferralGroups = useMemo(() => {
    return groupedReferrals.filter((group) => {
      // Check if any referral in the group matches the filter criteria
      return group.referrals.some((referral) => {
        // Get the button text that would be shown in the UI
        const buttonText = getButtonProps(referral, false).text

        // Filter by button text instead of button state
        if (activeFilter !== "All" && buttonText !== activeFilter) {
          return false
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return (
            referral.referralCode?.toLowerCase().includes(query) ||
            referral.country?.toLowerCase().includes(query) ||
            referral.referredReferralCode?.toLowerCase().includes(query)
          )
        }

        return true
      })
    })
  }, [groupedReferrals, activeFilter, searchQuery])

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-gray-400 text-sm">Track your referrals and their progress through each level</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by code or country..."
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

      {/* Error message with refresh button */}
      {error && (
        <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={handleRefresh}
            className="bg-white text-red-500 px-2 py-1 rounded-md text-xs font-medium flex items-center"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </button>
        </div>
      )}

      {/* Referrals Table */}
      <div className="px-6 mt-2 relative">
        {/* Loading indicator in corner */}
        {refreshing && (
          <div className="absolute top-2 right-8 z-10">
            <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
          </div>
        )}

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
                onClick={() => setActiveFilter("Locked")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Locked" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Locked
              </button>
              <button
                onClick={() => setActiveFilter("Claim")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Claim" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Claim
              </button>
              <button
                onClick={() => setActiveFilter("Claimed")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Claimed" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Claimed
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
                <div className="p-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mb-2"></div>
                  <div>Loading referrals{retryCount > 0 ? ` (Retry ${retryCount}/2)` : ""}...</div>
                </div>
              ) : filteredReferralGroups.length === 0 ? (
                <div className="p-4 text-center">
                  {error ? "Error loading referrals" : "No referrals found"}
                  <div className="text-xs text-gray-500 mt-2">
                    {!error && "Share your referral code to start earning rewards"}
                  </div>
                </div>
              ) : (
                <table className="w-full table-fixed">
                  <tbody>
                    {filteredReferralGroups.map((group, groupIndex) =>
                      // For each group, render all its referrals
                      group.referrals.map((referral, index) => {
                        const isProcessing =
                          claimingReferral !== null &&
                          claimingReferral.id === referral.referredUuid &&
                          claimingReferral.level === referral.level
                        const buttonProps = getButtonProps(referral, isProcessing)

                        return (
                          <tr
                            key={`${groupIndex}-${index}`}
                            className={`border-b ${
                              index === group.referrals.length - 1 ? "border-gray-600" : "border-gray-800"
                            }`}
                            style={{
                              backgroundColor: index === 0 ? "#1c1e26" : index === 1 ? "#1f2029" : "#22232d",
                            }}
                          >
                            <td className="py-[6px] px-4 text-[10px] w-[20%]">
                              {index === 0 ? referral.referredReferralCode || referral.referralCode : ""}
                            </td>
                            <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.country}</td>
                            <td className="py-[6px] px-4 text-[10px] w-[10%]">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] ${
                                  referral.status === "active"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {referral.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-[6px] px-4 text-[10px] w-[10%]">{referral.level}</td>
                            <td className="py-[6px] px-4 text-[10px] w-[15%]">
                              <div className="w-full h-1 bg-gray-700 rounded-full">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{
                                    width: `${(referral.investedCount / 5) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <div className="text-[9px] text-gray-400 mt-1">{`${referral.investedCount}/5`}</div>
                            </td>
                            <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.registerDate}</td>
                            <td className="py-[6px] px-4 text-[10px] w-[15%]">
                              <button
                                onClick={async () => {
                                  if (!buttonProps.disabled && !isProcessing) {
                                    // Log which button is being clicked
                                    console.log(
                                      `Clicked claim button for referral: ${referral.referredUuid}, level: ${referral.level}`,
                                    )

                                    // Only update the UI for this specific button
                                    setReferralData((prevData) =>
                                      prevData.map((ref) =>
                                        ref.referredUuid === referral.referredUuid && ref.level === referral.level
                                          ? { ...ref, buttonState: "claimed" }
                                          : ref,
                                      ),
                                    )

                                    // Then process the claim for this specific referral and level
                                    handleClaim(
                                      referral.referredUuid,
                                      referral.level,
                                      referral.referredReferralCode || referral.referralCode,
                                    )
                                  }
                                }}
                                disabled={buttonProps.disabled || isProcessing}
                                className={`px-4 py-1 rounded text-[10px] w-16 ${buttonProps.className}`}
                              >
                                {isProcessing ? "..." : buttonProps.text}
                              </button>
                            </td>
                          </tr>
                        )
                      }),
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
