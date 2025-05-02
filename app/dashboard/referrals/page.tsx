"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, RefreshCw } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Define the type for referral data
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
  claimed: boolean
  claim_date: string | null
}

// Group type for organizing referrals by code
interface ReferralGroup {
  referralCode: string
  referrals: FormattedReferral[]
}

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [referralData, setReferralData] = useState<FormattedReferral[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false) // Separate state for background refreshes
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const router = useRouter()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()
  const [claimingReferralId, setClaimingReferralId] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

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
      setDebugInfo((prev) => ({ ...prev, userId: user.id }))

      // Get all referrals where the current user is the referrer using the corrected referrer_uuid column
      const { data, error: fetchError } = await supabase
        .from("levels")
        .select("*")
        .eq("referrer_uuid", user.id)
        .order("register_date", { ascending: false })

      if (fetchError) {
        console.error("Error fetching referrals:", fetchError)
        setDebugInfo((prev) => ({ ...prev, fetchError: fetchError.message }))
        throw new Error(`Failed to fetch referrals: ${fetchError.message}`)
      }

      console.log("Raw referrals data:", data)
      setDebugInfo((prev) => ({ ...prev, rawData: data }))

      if (!data || data.length === 0) {
        console.log("No referrals found with referrer_uuid query, trying fallback query")

        // Try a direct query without filters as a fallback - but only for development/debugging
        // In production, we should only show the user's own referrals
        if (process.env.NODE_ENV === "development") {
          const { data: allData, error: allError } = await supabase
            .from("levels")
            .select("*")
            .limit(20)
            .order("register_date", { ascending: false })

          if (allError) {
            console.error("Error fetching all referrals:", allError)
            setDebugInfo((prev) => ({ ...prev, allError: allError.message }))
          } else if (allData && allData.length > 0) {
            console.log("Found some referrals with direct query:", allData.length)
            setDebugInfo((prev) => ({ ...prev, allData: allData }))

            // Process all data without filtering by user
            const processedData: FormattedReferral[] = allData.map((item) => {
              // Extract the progress value (e.g., "3/5")
              const progressText = item.progress || "0/5"
              const activeCount = extractProgressValue(progressText)

              // Determine claim status
              let claimStatus: "claimed" | "eligible" | "pending" = "pending"
              if (item.claimed) {
                claimStatus = "claimed"
              } else if (activeCount >= 5) {
                claimStatus = "eligible"
              }

              return {
                referralId: item.referral_id || "",
                referralCode: item.referral_code || "Unknown",
                email: item.referred_email || item.email || "Unknown",
                country: item.country || "Unknown",
                status: item.status || "pending",
                level: String(item.level || "1"),
                progress: progressText,
                claimStatus,
                registerDate: item.register_date ? format(new Date(item.register_date), "dd MMM, h:mm a") : "Unknown",
                referredUuid: item.user_uuid || "",
                activeCount,
                claimed: item.claimed || false,
                claim_date: item.claim_date,
              }
            })

            console.log("Processed all data:", processedData.length, "records")
            setReferralData(processedData)
            setLoading(false)
            setRefreshing(false)
            return
          }
        }

        setReferralData([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Process the data
      const processedData: FormattedReferral[] = data.map((item) => {
        // Extract the progress value (e.g., "3/5") directly from the database
        const progressText = item.progress || "0/5"
        const activeCount = extractProgressValue(progressText)

        // Determine claim status
        let claimStatus: "claimed" | "eligible" | "pending" = "pending"
        if (item.claimed) {
          claimStatus = "claimed"
        } else if (activeCount >= 5) {
          claimStatus = "eligible"
        }

        return {
          referralId: item.referral_id || "",
          referralCode: item.referral_code || "Unknown",
          email: item.referred_email || item.email || "Unknown",
          country: item.country || "Unknown",
          status: item.status || "pending",
          level: String(item.level || "1"),
          progress: progressText,
          claimStatus,
          registerDate: item.register_date ? format(new Date(item.register_date), "dd MMM, h:mm a") : "Unknown",
          referredUuid: item.user_uuid || "",
          activeCount,
          claimed: item.claimed || false,
          claim_date: item.claim_date,
        }
      })

      console.log("Processed data:", processedData.length, "records")
      setReferralData(processedData)
      setLoading(false)
      setRefreshing(false)
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error("Error in fetchReferrals:", err)
      setDebugInfo((prev) => ({ ...prev, error: err.message }))

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

  // Group referrals by referral code and sort by level
  const groupedReferrals = useMemo(() => {
    // Create a map to group referrals by code
    const referralMap = new Map<string, FormattedReferral[]>()

    referralData.forEach((referral) => {
      const code = referral.referralCode
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

  // Handle claim button click
  const handleClaim = async (referralId: string, level: string) => {
    if (!user || !referralId) return

    setClaimingReferralId(referralId)

    try {
      // Award 1 PWT for all levels
      const pwtAmount = 1 // Fixed at 1 PWT for all levels

      // Create a new client for the update
      const supabase = createClientComponentClient<Database>()

      // Update the database to mark the referral as claimed
      const { error } = await supabase
        .from("levels")
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
      fetchReferrals(0, true) // Background refresh
      setClaimingReferralId(null)
    } catch (error: any) {
      console.error("Error in claim process:", error)
      setClaimSuccess(`An error occurred during the claim process: ${error.message || "Unknown error"}`)
      setTimeout(() => setClaimSuccess(""), 3000)
      setClaimingReferralId(null)
    }
  }

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

  // Filter referral groups based on active filter and search query
  const filteredReferralGroups = useMemo(() => {
    return groupedReferrals.filter((group) => {
      // Check if any referral in the group matches the filter criteria
      return group.referrals.some((referral) => {
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
    })
  }, [groupedReferrals, activeFilter, searchQuery])

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
                      group.referrals.map((referral, index) => (
                        <tr
                          key={`${groupIndex}-${index}`}
                          className={`border-b ${index === group.referrals.length - 1 ? "border-gray-600" : "border-gray-800"}`}
                          style={{
                            backgroundColor: index === 0 ? "#1c1e26" : index === 1 ? "#1f2029" : "#22232d",
                          }}
                        >
                          <td className="py-[6px] px-4 text-[10px] w-[20%]">
                            {index === 0 ? referral.referralCode : ""}
                          </td>
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
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">
                            <div className="w-full h-1 bg-gray-700 rounded-full">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(referral.activeCount / 5) * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-[9px] text-gray-400 mt-1">{referral.progress}</div>
                          </td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.registerDate}</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">
                            <button
                              onClick={() =>
                                referral.claimStatus === "eligible" && handleClaim(referral.referralId, referral.level)
                              }
                              disabled={
                                referral.claimStatus !== "eligible" || claimingReferralId === referral.referralId
                              }
                              className={`px-4 py-1 rounded text-[10px] w-16 ${
                                referral.claimStatus === "claimed"
                                  ? "bg-gray-500 text-white cursor-not-allowed"
                                  : referral.claimStatus === "eligible"
                                    ? "bg-white text-black hover:bg-gray-200"
                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              {referral.claimStatus === "claimed"
                                ? "Claimed"
                                : claimingReferralId === referral.referralId
                                  ? "..."
                                  : referral.claimStatus === "eligible"
                                    ? "Claim"
                                    : "Pending"}
                            </button>
                          </td>
                        </tr>
                      )),
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
