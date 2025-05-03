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
  const [router] = useRouter()
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

      // Query the progression view table for the current user's referrals
      const { data, error: fetchError } = await supabase
        .from("progression_view")
        .select(`
          referred_uuid,
          level,
          invested_count,
          referral_uuid,
          referred_referral_code,
          referral_code,
          country,
          referral_date,
          button_state
        `)
        .eq("referral_uuid", user.id)
        .order("level", { ascending: true })
        .order("referral_date", { ascending: false })

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

      // Process the data
      const processedData: FormattedReferral[] = data.map((item) => {
        // Determine status based on invested_count
        const status = item.invested_count > 0 ? "active" : "inactive"

        // Ensure we're getting the correct button state from the database
        // If button_state is null or undefined, determine it based on invested_count
        let buttonState: "Locked" | "claimable" | "claimed"

        if (item.button_state) {
          buttonState = item.button_state as "Locked" | "claimable" | "claimed"
        } else {
          // Fallback logic if button_state is not provided
          // Check if the referral has been claimed and not reset
          const isClaimable = item.invested_count >= 5

          if (isClaimable) {
            buttonState = "claimable"
          } else {
            buttonState = "Locked"
          }
        }

        console.log(
          `Referral ${item.referred_referral_code || item.referral_code}, Level ${item.level}: Button state = ${buttonState}`,
        )

        return {
          referredUuid: item.referred_uuid || "",
          level: String(item.level || "1"),
          investedCount: item.invested_count || 0,
          progress: `${item.investedCount || 0}/5`,
          referralUuid: item.referral_uuid || "",
          referralCode: item.referral_code || "Unknown",
          referredReferralCode: item.referred_referral_code || "",
          country: item.country || "Unknown",
          status: status,
          registerDate: item.referral_date ? format(new Date(item.referral_date), "dd MMM, h:mm a") : "Unknown",
          buttonState: buttonState,
        }
      })

      console.log("Processed data:", processedData.length, "records")
      setReferralData(processedData)

      // Add this inside the fetchReferrals function, right after processing the data
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

  // Function to check if any claims have been reset
  const checkForResetClaims = async () => {
    if (!user) return

    try {
      const supabase = createClientComponentClient<Database>()

      // Query for any reset claims
      const { data, error } = await supabase
        .from("referral_claims")
        .select("referred_uuid, level, reset_at, reset_reason")
        .eq("claimed_by", user.id)
        .eq("status", "reset")
        .order("reset_at", { ascending: false })

      if (error) {
        console.error("Error checking for reset claims:", error)
        return
      }

      if (data && data.length > 0) {
        console.log("Found reset claims:", data)

        // Notify the user about reset claims
        const resetClaim = data[0] // Get the most recent reset
        setClaimSuccess(
          `A referral claim for level ${resetClaim.level} has been reset due to vesting schedule changes. You can claim again when conditions are met.`,
        )

        setTimeout(() => {
          setClaimSuccess("")
        }, 5000)

        // Mark these reset claims as acknowledged
        for (const claim of data) {
          await supabase
            .from("referral_claims")
            .update({ status: "reset_acknowledged" })
            .eq("referred_uuid", claim.referred_uuid)
            .eq("level", claim.level)
            .eq("claimed_by", user.id)
        }
      }
    } catch (err) {
      console.error("Error in checkForResetClaims:", err)
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
        checkForResetClaims() // Add this line
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

  // Filter referral groups based on active filter and search query
  const filteredReferralGroups = useMemo(() => {
    return groupedReferrals.filter((group) => {
      // Check if any referral in the group matches the filter criteria
      return group.referrals.some((referral) => {
        // Filter by status
        if (
          (activeFilter === "Active" && referral.status !== "active") ||
          (activeFilter === "Inactive" && referral.status !== "inactive")
        ) {
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
        return {
          text: "Claimed",
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
                onClick={() => setActiveFilter("Active")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Active" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveFilter("Inactive")}
                className={`px-6 py-1.5 text-xs font-medium ${
                  activeFilter === "Inactive" ? "bg-white text-black" : "bg-[#1c1e26] text-white"
                }`}
              >
                Inactive
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
