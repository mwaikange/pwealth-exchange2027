"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const router = useRouter()
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()

  // Sample countries for randomization
  const countries = [
    "South Africa",
    "Namibia",
    "Botswana",
    "Zimbabwe",
    "Kenya",
    "Nigeria",
    "Ghana",
    "Egypt",
    "Morocco",
    "Tanzania",
  ]

  // Generate referral data
  const generateReferralData = () => {
    return Array.from({ length: 50 }).map((_, index) => {
      // Determine progress based on index
      let progress
      if (index % 7 === 0) {
        progress = "0/5" // Inactive
      } else if (index % 7 === 6) {
        progress = "5/5" // Completed
      } else {
        progress = `${(index % 5) + 1}/5` // In progress
      }

      // Determine claim status based on progress
      let claimStatus
      if (progress === "0/5") {
        claimStatus = "pending" // Gray button - inactive
      } else if (progress === "5/5") {
        claimStatus = index % 4 === 0 ? "claimed" : "eligible" // Green or white button
      } else {
        claimStatus = "pending" // Gray button - in progress
      }

      // Determine status based on progress
      const status = progress === "0/5" ? "Inactive" : "Active"

      return {
        referralId: `RFRL-${3000288 + index}`,
        country: countries[index % countries.length],
        status,
        progress,
        claimStatus,
        registerDate: "12 May, 5:40pm",
      }
    })
  }

  const referralData = generateReferralData()

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
      return referral.referralId.toLowerCase().includes(query) || referral.country.toLowerCase().includes(query)
    }

    return true
  })

  // Handle claim button click
  const handleClaim = (referralId: string) => {
    // Add 1 PWT to cashout balance
    claimToPwtCashout(1)

    // Log the transaction
    addTransaction({
      type: "REFERRAL CLAIM",
      account: "PWT Cashout",
      amount: 1,
      amountUsd: 10,
      description: `REFERRAL CLAIM - ${referralId}`,
    })

    // Show success message
    setClaimSuccess(`Successfully claimed 1 PWT from referral ${referralId}`)

    // Clear success message after 3 seconds
    setTimeout(() => {
      setClaimSuccess("")
    }, 3000)
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
        </div>
      </div>
    </div>
  )
}
