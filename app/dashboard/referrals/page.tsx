"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-singleton"

// Define referral type
interface Referral {
  referralId: string
  country: string
  status: "Active" | "Inactive"
  progress: string
  claimStatus: "pending" | "claimed" | "eligible"
  registerDate: string
  email: string
}

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()

  // Fetch referrals from database
  useEffect(() => {
    async function fetchReferrals() {
      if (!user) return

      try {
        setLoading(true)

        // Get user's referral code
        const { data: userData, error: userError } = await supabase
          .from("usersettings")
          .select("referral_code")
          .eq("user_uuid", user.id)
          .single()

        if (userError) {
          console.error("Error fetching user referral code:", userError)
          setReferrals([])
          return
        }

        const referralCode = userData?.referral_code

        // Get referrals using the referral code
        const { data: referralData, error: referralError } = await supabase
          .from("referrals")
          .select(`
            referral_id,
            referral_code,
            referred_email,
            referral_date,
            app_users!referrals_user_uuid_fkey(country)
          `)
          .eq("referrer_uuid", user.id)

        if (referralError) {
          console.error("Error fetching referrals:", referralError)
          setReferrals([])
          return
        }

        // Get vesting progress for each referral
        const formattedReferrals: Referral[] = await Promise.all(
          (referralData || []).map(async (ref) => {
            // Get vesting schedules for this referral
            const { data: vestingData, error: vestingError } = await supabase
              .from("vesting_schedules")
              .select("level, status")
              .eq("user_uuid", ref.user_uuid)
              .order("level")

            if (vestingError) {
              console.error("Error fetching vesting schedules:", vestingError)
            }

            // Calculate progress
            const totalSchedules = vestingData?.length || 5
            const completedSchedules = vestingData?.filter((s) => s.status === "Claimed").length || 0
            const progress = `${completedSchedules}/${totalSchedules}`

            // Determine claim status
            let claimStatus: "pending" | "claimed" | "eligible" = "pending"

            // Check if user has claimed this referral
            const { data: claimData } = await supabase
              .from("referral_claims")
              .select("id")
              .eq("referral_id", ref.referral_id)
              .single()

            if (claimData) {
              claimStatus = "claimed"
            } else {
              // Check if all level 1 schedules are claimed (eligible)
              const level1Schedules = vestingData?.filter((s) => s.level === "1") || []
              const allLevel1Claimed = level1Schedules.every((s) => s.status === "Claimed")

              if (allLevel1Claimed && level1Schedules.length > 0) {
                claimStatus = "eligible"
              }
            }

            // Determine status
            const status = completedSchedules > 0 ? "Active" : "Inactive"

            return {
              referralId: ref.referral_id || `RFRL-${Math.floor(Math.random() * 1000000)}`,
              country: ref.app_users?.country || "Unknown",
              status,
              progress,
              claimStatus,
              registerDate: new Date(ref.referral_date).toLocaleString("en-US", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              email: ref.referred_email,
            }
          }),
        )

        setReferrals(formattedReferrals)
      } catch (error) {
        console.error("Error fetching referrals:", error)
        setReferrals([])
      } finally {
        setLoading(false)
      }
    }

    fetchReferrals()
  }, [user])

  // Filter referrals based on active filter and search query
  const filteredReferrals = referrals.filter((referral) => {
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
        referral.referralId.toLowerCase().includes(query) ||
        referral.country.toLowerCase().includes(query) ||
        referral.email.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Handle claim button click
  const handleClaim = async (referralId: string) => {
    if (!user) return

    try {
      // Add 1 PWT to cashout balance
      await claimToPwtCashout(1)

      // Log the transaction
      await addTransaction({
        type: "REFERRAL CLAIM",
        account: "PWT Cashout",
        amount: 1,
        amountUsd: 10,
        description: `REFERRAL CLAIM - ${referralId}`,
      })

      // Record the claim in the database
      await supabase.from("referral_claims").insert({
        user_uuid: user.id,
        referral_id: referralId,
        amount: 1,
        claimed_at: new Date().toISOString(),
      })

      // Update local state to reflect the claim
      setReferrals((prev) =>
        prev.map((ref) => (ref.referralId === referralId ? { ...ref, claimStatus: "claimed" } : ref)),
      )

      // Show success message
      setClaimSuccess(`Successfully claimed 1 PWT from referral ${referralId}`)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setClaimSuccess("")
      }, 3000)
    } catch (error) {
      console.error("Error claiming referral:", error)
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

      {/* Loading state */}
      {loading ? (
        <div className="px-6 mt-2">
          <div className="bg-[#2a2d3a] rounded-lg p-4">
            <div className="flex justify-center py-3">
              <div className="inline-flex rounded-md overflow-hidden">
                <div className="px-6 py-1.5 text-xs font-medium bg-[#1c1e26] text-white">Loading referrals...</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Referrals Table */
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

            {/* Empty state */}
            {filteredReferrals.length === 0 && (
              <div className="p-6 text-center text-gray-400">
                <p>No referrals found. Share your referral code to start earning rewards!</p>
              </div>
            )}

            {/* Table with fixed header and scrollable body */}
            {filteredReferrals.length > 0 && (
              <div className="relative">
                {/* Fixed Header */}
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-gray-700 bg-[#1c1e26]">
                      <th className="text-left py-2 px-4 text-[11px] font-medium w-[25%]">Referral Code</th>
                      <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Country</th>
                      <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Status</th>
                      <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Progress</th>
                      <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Register Date</th>
                      <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Claim</th>
                    </tr>
                  </thead>
                </table>

                {/* Scrollable Body */}
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <table className="w-full table-fixed">
                    <tbody>
                      {filteredReferrals.map((referral, index) => (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="py-[6px] px-4 text-[10px] w-[25%]">{referral.referralId}</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.country}</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] ${
                                referral.status === "Active"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {referral.status}
                            </span>
                          </td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.progress}</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.registerDate}</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">
                            {referral.claimStatus === "pending" && (
                              <button
                                disabled
                                className="bg-gray-500 text-white px-4 py-1 rounded text-[10px] w-16 cursor-not-allowed opacity-70"
                              >
                                claim
                              </button>
                            )}
                            {referral.claimStatus === "claimed" && (
                              <button
                                disabled
                                className="bg-green-500 text-white px-4 py-1 rounded text-[10px] w-16 cursor-not-allowed"
                              >
                                claimed
                              </button>
                            )}
                            {referral.claimStatus === "eligible" && (
                              <button
                                onClick={() => handleClaim(referral.referralId)}
                                className="bg-white text-black px-4 py-1 rounded text-[10px] w-16 hover:bg-gray-100"
                              >
                                claim
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
