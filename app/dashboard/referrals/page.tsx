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
  referrer_uuid: string
  referred_uuid: string
  referred_email: string
  referral_date: string
  referred_referral_code: string
  claimed: boolean
  claim_date: string | null
  country: string
  email_confirmed_at: string | null
  status: string
  level: string
  active_count: number
}

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [referralData, setReferralData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()

  // Fetch referral data from Supabase
  useEffect(() => {
    async function fetchReferrals() {
      if (!user) return

      setLoading(true)
      const supabase = createClientComponentClient()

      // Fetch from the referral_view
      const { data, error } = await supabase.from("referral_view").select("*").eq("referrer_uuid", user.id)

      if (error) {
        console.error("Error fetching referrals:", error)
        setReferralData([])
      } else if (data) {
        // Transform the data to match our UI needs
        const transformedData = data.map((ref: ReferralViewData) => ({
          referralId: ref.referral_id,
          referralCode: ref.referred_referral_code,
          country: ref.country || "Unknown", // Use full country name directly
          status: ref.status,
          level: ref.level,
          progress: `${ref.active_count}/5`,
          claimStatus: ref.claimed ? "claimed" : ref.active_count === 5 ? "eligible" : "pending",
          registerDate: ref.referral_date ? format(new Date(ref.referral_date), "dd MMM, h:mm a") : "Unknown",
          referredUuid: ref.referred_uuid,
          activeCount: ref.active_count,
        }))

        setReferralData(transformedData)
      }

      setLoading(false)
    }

    fetchReferrals()
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
      return referral.referralCode?.toLowerCase().includes(query) || referral.country?.toLowerCase().includes(query)
    }

    return true
  })

  // Handle claim button click
  const handleClaim = async (referralId: string, level: string) => {
    if (!user) return

    // Award PWT based on level
    const levelNum = Number.parseInt(level, 10)
    const pwtAmount = levelNum // Level 1 = 1 PWT, Level 2 = 2 PWT, Level 3 = 3 PWT

    try {
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
        return
      }

      // Add to cashout balance
      claimToPwtCashout(pwtAmount)

      // Log the transaction
      addTransaction({
        type: "REFERRAL CLAIM",
        account: "PWT Cashout",
        amount: pwtAmount,
        amountUsd: pwtAmount * 10,
        description: `REFERRAL CLAIM - ${referralId} (Level ${level})`,
      })

      // Update the local state to reflect the change
      setReferralData((prevData) =>
        prevData.map((ref) => (ref.referralId === referralId ? { ...ref, claimStatus: "claimed" } : ref)),
      )

      // Show success message
      setClaimSuccess(`Successfully claimed ${pwtAmount} PWT from referral (Level ${level})`)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setClaimSuccess("")
      }, 3000)
    } catch (error) {
      console.error("Error in claim process:", error)
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
              ) : filteredReferrals.length === 0 ? (
                <div className="p-4 text-center">No referrals found</div>
              ) : (
                <table className="w-full table-fixed">
                  <tbody>
                    {filteredReferrals.map((referral, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-[6px] px-4 text-[10px] w-[20%]">{referral.referralCode}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.country}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[10%]">
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
                        <td className="py-[6px] px-4 text-[10px] w-[10%]">{referral.level}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.progress}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">{referral.registerDate}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">
                          {referral.claimStatus === "pending" && (
                            <button
                              disabled
                              className="bg-gray-500 text-white px-4 py-1 rounded text-[10px] w-16 cursor-not-allowed opacity-70"
                            >
                              locked
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
                              onClick={() => handleClaim(referral.referralId, referral.level)}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
