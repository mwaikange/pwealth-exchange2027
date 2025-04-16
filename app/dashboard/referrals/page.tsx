"use client"

import { useState } from "react"

export default function Referrals() {
  const [activeFilter, setActiveFilter] = useState("All")
  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-gray-400 text-sm">Claim your referral earnings once your referral has completed Level 1</p>
        </div>
        <button className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium">Copy Referral Code</button>
      </div>

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
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[30%]">Email</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[20%]">Status</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Progress</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[20%]">Register Date</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Claim</th>
                </tr>
              </thead>
            </table>

            {/* Scrollable Body */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <table className="w-full table-fixed">
                <tbody>
                  {Array.from({ length: 50 })
                    .map((_, index) => {
                      // Determine progress and claim status based on index
                      const progress = index % 3 === 0 ? "3/5" : "5/5"
                      let claimStatus
                      if (progress === "3/5") {
                        claimStatus = "pending" // Gray button
                      } else {
                        claimStatus = index % 4 === 0 ? "claimed" : "eligible" // Green or white button
                      }

                      // Filter logic
                      if (
                        (activeFilter === "Claimed" && claimStatus !== "claimed") ||
                        (activeFilter === "Not Claimed" && claimStatus === "claimed")
                      ) {
                        return null
                      }

                      return (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="py-[6px] px-4 text-[10px] w-[30%]">mwaikange@gamil.com</td>
                          <td className="py-[6px] px-4 text-[10px] w-[20%]">Active</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">{progress}</td>
                          <td className="py-[6px] px-4 text-[10px] w-[20%]">12 May, 5:40pm</td>
                          <td className="py-[6px] px-4 text-[10px] w-[15%]">
                            {claimStatus === "pending" && (
                              <button className="bg-gray-500 text-white px-4 py-1 rounded text-[10px] w-16">
                                claim
                              </button>
                            )}
                            {claimStatus === "claimed" && (
                              <button className="bg-green-500 text-white px-4 py-1 rounded text-[10px] w-16">
                                claimed
                              </button>
                            )}
                            {claimStatus === "eligible" && (
                              <button className="bg-white text-black px-4 py-1 rounded text-[10px] w-16">claim</button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                    .filter(Boolean)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
