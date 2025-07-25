"use client"

import { useState } from "react"
import { Clock, Lock, CheckCircle } from "lucide-react"

interface VestingSlotProps {
  slot: {
    id: string
    status: "empty" | "in_progress" | "claimable"
    startDate?: number
    amount: number
    progress: number
    level: number
  }
  slotIndex: number
  onVest: (slotIndex: number) => void
  onClaim: (slotIndex: number) => void
}

export function VestingSlot({ slot, slotIndex, onVest, onClaim }: VestingSlotProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Get level info
  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1:
        return { name: "Retail", days: 5, range: "1-50" }
      case 2:
        return { name: "Small Business", days: 30, range: "51-500" }
      case 3:
        return { name: "Corporate", days: 90, range: "501+" }
      default:
        return { name: "Retail", days: 5, range: "1-50" }
    }
  }

  const levelInfo = getLevelInfo(slot.level)

  // Calculate unlock date for locked slots
  const getUnlockDate = () => {
    if (slot.startDate) {
      const unlockTime = slot.startDate + levelInfo.days * 24 * 60 * 60 * 1000
      return new Date(unlockTime)
    }
    return null
  }

  const unlockDate = getUnlockDate()

  // Format date and time
  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderSlotContent = () => {
    switch (slot.status) {
      case "empty":
        return (
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-3">Click VEST to begin locking shares</div>
            <div className="text-slate-500 text-xs mb-4">
              Hold period: {levelInfo.name} ({levelInfo.days} days)
            </div>
            <button
              onClick={() => onVest(slotIndex)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                isHovered ? "bg-blue-600 text-white transform scale-105" : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              VEST
            </button>
          </div>
        )

      case "in_progress":
        return (
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Lock className="w-4 h-4 text-red-400 mr-2" />
              <span className="text-red-400 font-medium text-sm">LOCKED</span>
            </div>
            <div className="text-slate-300 text-sm mb-2">{slot.amount.toFixed(4)} shares locked</div>
            {unlockDate && <div className="text-slate-400 text-xs mb-3">Unlocks: {formatDateTime(unlockDate)}</div>}
            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${slot.progress}%` }}
              />
            </div>
            <button
              disabled
              className="w-full py-2 px-4 rounded-lg font-medium bg-slate-600 text-slate-400 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 inline mr-2" />
              LOCKED
            </button>
          </div>
        )

      case "claimable":
        return (
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-green-400 font-medium text-sm">READY TO CLAIM</span>
            </div>
            <div className="text-slate-300 text-sm mb-2">{slot.amount.toFixed(4)} shares ready</div>
            {unlockDate && <div className="text-slate-400 text-xs mb-3">Unlocked: {formatDateTime(unlockDate)}</div>}
            <button
              onClick={() => onClaim(slotIndex)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                isHovered ? "bg-green-600 text-white transform scale-105" : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              CLAIM
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-slate-100 font-medium">Slot {slotIndex + 1}</h4>
        {slot.status === "in_progress" && (
          <div className="flex items-center text-yellow-400 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {Math.round(slot.progress)}%
          </div>
        )}
      </div>
      {renderSlotContent()}
    </div>
  )
}
