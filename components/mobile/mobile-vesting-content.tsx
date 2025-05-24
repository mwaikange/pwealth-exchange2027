"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useMobile } from "@/hooks/use-mobile"

export default function MobileVestingContent() {
  const router = useRouter()
  const isMobile = useMobile()
  const [currentLevel, setCurrentLevel] = useState(1)

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard/vesting")
    }
  }, [isMobile, router])

  const schedules = [
    { id: "1A", progress: 76, status: "activate" },
    { id: "1B", progress: 76, status: "activate" },
    { id: "1C", progress: 76, status: "activate" },
    { id: "1D", progress: 76, status: "activate" },
    { id: "1E", progress: 76, status: "activate" },
  ]

  const getButtonText = (status: string) => {
    switch (status) {
      case "activate":
        return "ACTIVATE"
      case "invest":
        return "INVEST"
      case "claim_inactive":
        return "CLAIM"
      case "claim_active":
        return "CLAIM"
      case "claimed":
        return "CLAIMED"
      default:
        return "ACTIVATE"
    }
  }

  const getButtonStyle = (status: string) => {
    switch (status) {
      case "activate":
      case "invest":
      case "claim_active":
        return "bg-white text-black"
      case "claim_inactive":
        return "bg-gray-500 text-white cursor-not-allowed"
      case "claimed":
        return "bg-green-500 text-white cursor-not-allowed"
      default:
        return "bg-white text-black"
    }
  }

  return (
    <MobileLayout currentPage="vesting">
      <div className="p-4">
        {/* Level Navigation */}
        <div className="bg-gray-200 text-black rounded-lg p-1 mb-4 flex">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => setCurrentLevel(level)}
              className={`flex-1 py-2 text-center rounded ${currentLevel === level ? "bg-white shadow" : ""}`}
            >
              LEVEL {level}
            </button>
          ))}
        </div>

        {/* Schedules */}
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-gray-200 text-black rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">
                  LEVEL {currentLevel}
                  {schedule.id.slice(-1)}
                </div>
                <div className="text-sm">{schedule.progress}%</div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-300 rounded-full h-2 mb-3">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${schedule.progress}%` }}></div>
              </div>

              {/* Schedule Details */}
              <div className="text-xs text-gray-600 mb-3">
                Maturity Date -22/04/2025 | 5:19:07 am | Expected Yield 10 PWT-Cashout
                <br />
                Maturity Yield: 10 tokens | (Claimed on maturity)
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  className={`px-6 py-2 rounded ${getButtonStyle(schedule.status)}`}
                  disabled={schedule.status === "claim_inactive" || schedule.status === "claimed"}
                >
                  {getButtonText(schedule.status)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  )
}
