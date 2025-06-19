"use client"

import { useState, useEffect } from "react"
import { Clock, CheckCircle } from "lucide-react"

export type VestingSlotStatus = "empty" | "in_progress" | "claimable"

export interface VestingSlotData {
  id: string
  status: VestingSlotStatus
  startDate?: number
  amount?: number
  progress?: number
}

interface VestingSlotProps {
  slot: VestingSlotData
  slotIndex: number
  onVest: (slotIndex: number, amount: number) => void
  onClaim: (slotIndex: number) => void
}

export function VestingSlot({ slot, slotIndex, onVest, onClaim }: VestingSlotProps) {
  const [progress, setProgress] = useState(slot.progress || 0)
  const [timeRemaining, setTimeRemaining] = useState("")

  // Update progress and time remaining
  useEffect(() => {
    if (slot.status === "in_progress" && slot.startDate) {
      const interval = setInterval(() => {
        const now = Date.now()
        const elapsed = now - slot.startDate!
        const totalTime = 5 * 24 * 60 * 60 * 1000 // 5 days in milliseconds
        const newProgress = Math.min(100, (elapsed / totalTime) * 100)

        setProgress(newProgress)

        if (newProgress >= 100) {
          setTimeRemaining("Ready to claim!")
        } else {
          const remaining = totalTime - elapsed
          const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
          const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
          const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

          if (days > 0) {
            setTimeRemaining(`${days}d ${hours}h remaining`)
          } else if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m remaining`)
          } else {
            setTimeRemaining(`${minutes}m remaining`)
          }
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [slot.status, slot.startDate])

  const handleVestClick = () => {
    const amount = prompt("How many shares do you want to vest?")
    if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      onVest(slotIndex, Number(amount))
    }
  }

  const handleClaimClick = () => {
    onClaim(slotIndex)
  }

  return (
    <div className="bg-[#2a2d3a] rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Slot {slotIndex + 1}</h3>
        <div className="flex items-center text-xs text-gray-400">
          {slot.status === "in_progress" && <Clock className="w-3 h-3 mr-1" />}
          {slot.status === "claimable" && <CheckCircle className="w-3 h-3 mr-1 text-green-500" />}
          {slot.status === "in_progress" && timeRemaining}
          {slot.status === "claimable" && "Ready to claim!"}
        </div>
      </div>

      {slot.status === "empty" && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm mb-4">Click VEST to begin locking shares for 5 days</div>
          <button
            onClick={handleVestClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            VEST
          </button>
        </div>
      )}

      {slot.status === "in_progress" && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Amount: {slot.amount} shares</span>
            <span className="text-green-500 font-medium">{Math.floor(progress)}%</span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-xs text-gray-400 text-center">
            Vesting in progress: {Math.floor(progress)}% complete — {timeRemaining}
          </div>
        </div>
      )}

      {slot.status === "claimable" && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Amount: {slot.amount} shares</span>
            <span className="text-green-500 font-medium">100%</span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full w-full" />
          </div>

          <div className="text-center">
            <div className="text-xs text-green-400 mb-3">100% complete — Click CLAIM to unlock your shares</div>
            <button
              onClick={handleClaimClick}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              CLAIM
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
