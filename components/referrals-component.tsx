"use client"

import { useEffect } from "react"
import { useToast } from "@chakra-ui/react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useUser } from "@supabase/auth-helpers-react"

export function ReferralsComponent() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const toast = useToast()

  const checkForAutoClaims = async () => {
    try {
      if (!user?.id) return // Exit if user is not available

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_uuid", user.id)
        .like("description", "%Auto Referral Claim%")
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      if (data && data.length > 0) {
        // Show notification for auto-claimed rewards
        const latestClaim = data[0]
        const claimDate = new Date(latestClaim.created_at).toLocaleDateString()

        toast({
          title: "Auto Referral Claim Processed",
          description: `${latestClaim.description} of ${latestClaim.amount} PWT was automatically processed on ${claimDate}`,
          status: "success",
          duration: 8000,
          isClosable: true,
        })
      }
    } catch (error) {
      console.error("Error checking for auto claims:", error)
    }
  }

  useEffect(() => {
    if (user) {
      // fetchReferralData(); // Assuming fetchReferralData is defined elsewhere and handles user being null
      checkForAutoClaims() // Add this line
    }
  }, [user, supabase, toast])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Referrals</h1>
        <p className="text-gray-400">Claim your referral earnings once your referral has completed Level 1</p>
      </div>

      <div className="bg-[#2a2d3a] rounded-lg p-4">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-md overflow-hidden">
            <button className="bg-white text-black px-4 py-2 text-sm font-medium">All</button>
            <button className="bg-[#1c1e26] text-white px-4 py-2 text-sm font-medium">Claimed</button>
            <button className="bg-[#1c1e26] text-white px-4 py-2 text-sm font-medium">Not Claimed</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Progress</th>
                <th className="text-left py-3 px-4">Register Date</th>
                <th className="text-left py-3 px-4">Claim</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(12)].map((_, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-3 px-4">mwaikange@gamil.com</td>
                  <td className="py-3 px-4">Active</td>
                  <td className="py-3 px-4">{index % 3 === 0 ? "3/5" : "5/5"}</td>
                  <td className="py-3 px-4">12 May, 5:40pm</td>
                  <td className="py-3 px-4">
                    {index % 3 === 0 ? (
                      <button className="bg-gray-500 text-white px-4 py-1 rounded text-sm">claim</button>
                    ) : (
                      <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded text-sm">
                        {index % 2 === 0 ? "claimed" : ""}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
