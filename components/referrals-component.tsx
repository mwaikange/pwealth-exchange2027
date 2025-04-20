"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-singleton"

interface Referral {
  id: string
  email: string
  date: string
  status: "pending" | "active" | "claimed"
}

export function ReferralsComponent() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [referralCode, setReferralCode] = useState("")

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch user's referral code
        const { data: userData, error: userError } = await supabase
          .from("app_users")
          .select("referral_code")
          .eq("user_id", user.id)
          .single()

        if (userError) {
          console.error("Error fetching referral code:", userError)
        } else if (userData) {
          setReferralCode(userData.referral_code || "")
        }

        // Fetch referrals
        const { data, error } = await supabase
          .from("referrals")
          .select("id, referred_email, created_at, status")
          .eq("referrer_id", user.id)

        if (error) {
          console.error("Error fetching referrals:", error)
        } else if (data) {
          const formattedReferrals = data.map((ref) => ({
            id: ref.id,
            email: ref.referred_email,
            date: new Date(ref.created_at).toLocaleDateString(),
            status: ref.status,
          }))
          setReferrals(formattedReferrals)
        }
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReferrals()
  }, [user])

  const handleCopyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`
    navigator.clipboard
      .writeText(referralLink)
      .then(() => alert("Referral link copied to clipboard!"))
      .catch((err) => console.error("Could not copy text: ", err))
  }

  const handleClaimReward = async (referralId: string) => {
    try {
      // Claim reward logic would go here

      // Update the referral status in the UI
      setReferrals((prev) => prev.map((ref) => (ref.id === referralId ? { ...ref, status: "claimed" as const } : ref)))
    } catch (error) {
      console.error("Error claiming reward:", error)
    }
  }

  return (
    <div className="h-full bg-[#1c1e26] overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Referrals</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Program Info */}
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Referral Program</h2>

          <div className="space-y-4">
            <p>Invite friends and earn rewards when they join and invest!</p>

            <div>
              <label className="block text-sm font-medium mb-1">Your Referral Code</label>
              <div className="flex">
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="flex-1 p-2 bg-[#1e2130] border border-gray-600 rounded-l-md focus:outline-none"
                />
                <button
                  onClick={handleCopyReferralLink}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-r-md"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <div className="bg-[#1e2130] p-4 rounded-md">
              <h3 className="font-medium mb-2">Rewards</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Earn 1 AFT token for each referral who registers</li>
                <li>Earn 5% of your referral's first investment</li>
                <li>Earn 2% of your referral's subsequent investments</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Your Referrals</h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1e2130]">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-[#3a3d4a]">
                      <td className="py-2 px-3 text-sm">{referral.email}</td>
                      <td className="py-2 px-3 text-sm text-gray-300">{referral.date}</td>
                      <td className="py-2 px-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            referral.status === "active"
                              ? "bg-green-900 text-green-300"
                              : referral.status === "claimed"
                                ? "bg-gray-700 text-gray-300"
                                : "bg-yellow-900 text-yellow-300"
                          }`}
                        >
                          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-right">
                        {referral.status === "active" ? (
                          <button
                            onClick={() => handleClaimReward(referral.id)}
                            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-medium rounded-md"
                          >
                            Claim Reward
                          </button>
                        ) : referral.status === "claimed" ? (
                          <span className="text-gray-400 text-xs">Claimed</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <p>You haven't referred anyone yet.</p>
              <p className="mt-2">Share your referral code to start earning rewards!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
