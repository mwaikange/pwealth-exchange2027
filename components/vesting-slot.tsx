"use client"

import { useState } from "react"
import { Clock, Lock, CheckCircle } from "lucide-react"

// Safe number conversion with fallback
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Safe toFixed with fallback
const safeToFixed = (value: any, decimals = 4): string => {
  const num = safeNumber(value)
  return num.toFixed(decimals)
}

interface VestingSlotProps {
  slot: {
    id?: string
    user_uuid?: string
    level?: number
    slot_number?: number
    shares?: number
    amount?: number
    status: "empty" | "locked" | "claimable" | "claimed" | "in_progress"
    created_at?: string
    updated_at?: string
    start_date?: string | Date
    start_time?: string | null
    end_time?: string | null
    progress?: number
    startDate?: number
  }
  slotIndex: number
  level?: number
  onVest: (slotIndex: number) => void
  onClaim: (slotIndex: number) => void
  availableShares?: number
  isProcessing?: boolean
}

export function VestingSlot({
  slot,
  slotIndex,
  level = 1,
  onVest,
  onClaim,
  availableShares = 0,
  isProcessing = false,
}: VestingSlotProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Get level info
  const getLevelInfo = (levelNum: number) => {
    switch (levelNum) {
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

  const levelInfo = getLevelInfo(slot.level || level)
  const shares = safeNumber(slot.shares || slot.amount)
  const progress = safeNumber(slot.progress)

  // Calculate unlock date for locked slots
  const getUnlockDate = () => {
    if (slot.start_time || slot.start_date) {
      const startTime = slot.start_time
        ? new Date(slot.start_time).getTime()
        : slot.startDate || (slot.start_date ? new Date(slot.start_date).getTime() : Date.now())
      const unlockTime = startTime + levelInfo.days * 24 * 60 * 60 * 1000
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

  // Handle vest action
  const handleVest = () => {
    if (onVest && !isProcessing) {
      onVest(slotIndex)
    }
  }

  // Handle claim action
  const handleClaim = () => {
    if (onClaim && !isProcessing) {
      onClaim(slotIndex)
    }
  }

  // Normalize status
  const normalizeStatus = (status: string) => {
    if (status === "locked" || status === "in_progress") return "in_progress"
    if (status === "claimable" || status === "claim") return "claimable"
    if (status === "claimed") return "claimed"
    return "empty"
  }

  const normalizedStatus = normalizeStatus(slot.status)

  const renderSlotContent = () => {
    switch (normalizedStatus) {
      case "empty":
        return (
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-3">Click VEST to begin locking shares</div>
            <div className="text-slate-500 text-xs mb-4">
              Hold period: {levelInfo.name} ({levelInfo.days} days)
            </div>
            <button
              onClick={handleVest}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={isProcessing || safeNumber(availableShares) <= 0}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                isHovered && !isProcessing && safeNumber(availableShares) > 0
                  ? "bg-blue-600 text-white transform scale-105"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              } ${isProcessing || safeNumber(availableShares) <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isProcessing ? "PROCESSING..." : "VEST"}
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
            <div className="text-slate-300 text-sm mb-2">{safeToFixed(shares)} shares locked</div>
            {unlockDate && <div className="text-slate-400 text-xs mb-3">Unlocks: {formatDateTime(unlockDate)}</div>}
            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
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
            <div className="text-slate-300 text-sm mb-2">{safeToFixed(shares)} shares ready</div>
            {unlockDate && <div className="text-slate-400 text-xs mb-3">Unlocked: {formatDateTime(unlockDate)}</div>}
            <button
              onClick={handleClaim}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={isProcessing}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                isHovered && !isProcessing
                  ? "bg-green-600 text-white transform scale-105"
                  : "bg-green-500 text-white hover:bg-green-600"
              } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isProcessing ? "CLAIMING..." : "CLAIM"}
            </button>
          </div>
        )

      case "claimed":
        return (
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-3">Slot available for new vesting</div>
            <div className="text-slate-500 text-xs mb-4">
              Hold period: {levelInfo.name} ({levelInfo.days} days)
            </div>
            <button
              onClick={handleVest}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={isProcessing || safeNumber(availableShares) <= 0}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                isHovered && !isProcessing && safeNumber(availableShares) > 0
                  ? "bg-blue-600 text-white transform scale-105"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              } ${isProcessing || safeNumber(availableShares) <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isProcessing ? "PROCESSING..." : "VEST AGAIN"}
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
        {/* Display 1-based slot numbers (slotIndex is 0-based from UI, but we show 1-based) */}
        <h4 className="text-slate-100 font-medium">Slot {slotIndex + 1}</h4>
        {normalizedStatus === "in_progress" && (
          <div className="flex items-center text-yellow-400 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {Math.round(progress)}%
          </div>
        )}
      </div>
      {renderSlotContent()}
    </div>
  )
}
