"use client"

import { Lock, CheckCircle } from "lucide-react"

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
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getUnlockDate = () => {
    if (!slot.startDate) return ""
    const holdPeriods = { 1: 5, 2: 30, 3: 90 }
    const holdDays = holdPeriods[slot.level as keyof typeof holdPeriods] || 5
    const unlockDate = new Date(slot.startDate + holdDays * 24 * 60 * 60 * 1000)
    return formatDate(unlockDate.getTime())
  }

  const renderSlotContent = () => {
    switch (slot.status) {
      case "empty":
        return (
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-3">Click VEST to begin locking shares</div>
            <div className="text-slate-500 text-xs mb-4">
              Hold period:{" "}
              {slot.level === 1
                ? "Retail (5 days)"
                : slot.level === 2
                  ? "Small Business (30 days)"
                  : "Corporate (90 days)"}
            </div>
            <button
              onClick={() => onVest(slotIndex)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
              <span className="text-red-400 font-medium">LOCKED</span>
            </div>
            <div className="text-slate-300 text-sm mb-2">{slot.amount.toFixed(4)} shares locked</div>
            <div className="text-slate-400 text-xs mb-3">Unlocks: {getUnlockDate()}</div>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${slot.progress}%` }}
              />
            </div>
            <div className="text-yellow-400 text-xs">{slot.progress.toFixed(1)}%</div>
            <button
              disabled
              className="w-full bg-slate-600 text-slate-400 font-medium py-2 px-4 rounded-lg cursor-not-allowed mt-3"
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
              <span className="text-green-400 font-medium">READY</span>
            </div>
            <div className="text-slate-300 text-sm mb-2">{slot.amount.toFixed(4)} shares ready</div>
            <div className="text-slate-400 text-xs mb-3">Unlocked: {getUnlockDate()}</div>
            <button
              onClick={() => onClaim(slotIndex)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-slate-200 font-medium">Slot {slotIndex + 1}</h4>
        {slot.status === "in_progress" && <div className="text-yellow-400 text-xs">{slot.progress.toFixed(0)}%</div>}
      </div>
      {renderSlotContent()}
    </div>
  )
}
