"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useVesting } from "@/contexts/vesting-context"
import { useMobile } from "@/hooks/use-mobile"

export default function MobileVestingPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const { vestingSchedules, activateSchedule, investInSchedule, claimSchedule } = useVesting()
  const [currentLevel, setCurrentLevel] = useState(1)

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard/vesting")
    }
  }, [isMobile, router])

  // Filter schedules for current level
  const currentSchedules = vestingSchedules?.filter((schedule) => schedule.level === currentLevel) || []

  return (
    <MobileLayout currentPage="vesting">
      <div className="p-4">
        {/* Level Tabs */}
        <div className="bg-[#2a2d3a] rounded mb-4 flex">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              className={`flex-1 py-2 text-center ${
                currentLevel === level ? "border-b-2 border-yellow-400 font-medium" : "text-gray-400"
              }`}
              onClick={() => setCurrentLevel(level)}
            >
              LEVEL {level}
            </button>
          ))}
        </div>

        {/* Schedules */}
        <div className="space-y-4">
          {currentSchedules.map((schedule, index) => {
            // Determine button state
            let buttonText = "ACTIVATE"
            let buttonColor = "bg-white text-black"
            let isDisabled = false

            if (schedule.status === "fee_paid") {
              buttonText = "INVEST"
            } else if (schedule.status === "invested") {
              buttonText = "CLAIM"
              if (schedule.progress < 20) {
                buttonColor = "bg-gray-500 text-white"
                isDisabled = true
              }
            } else if (schedule.status === "claimed") {
              buttonText = "CLAIMED"
              buttonColor = "bg-green-500 text-white"
              isDisabled = true
            }

            const handleButtonClick = () => {
              if (isDisabled) return

              if (buttonText === "ACTIVATE") {
                activateSchedule(schedule.id)
              } else if (buttonText === "INVEST") {
                investInSchedule(schedule.id)
              } else if (buttonText === "CLAIM") {
                claimSchedule(schedule.id)
              }
            }

            return (
              <div key={index} className="bg-[#2a2d3a] rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium">
                    LEVEL {currentLevel} {String.fromCharCode(65 + index)}
                  </div>
                  <div>{schedule.progress}%</div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-700 rounded-full mb-3">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${schedule.progress}%` }}></div>
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  <div>
                    Maturity Date - {schedule.maturityDate} | Expected Yield {schedule.expectedYield} PWT-Cashout
                  </div>
                  <div>
                    Maturity Yield: {schedule.maturityYield} tokens | {schedule.claimedStatus}
                  </div>
                </div>

                <button
                  className={`w-full py-2 rounded ${buttonColor} ${isDisabled ? "opacity-70" : "hover:opacity-90"}`}
                  onClick={handleButtonClick}
                  disabled={isDisabled}
                >
                  {buttonText}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </MobileLayout>
  )
}
