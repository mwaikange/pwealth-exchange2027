"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Lock, Unlock, CheckCircle, Loader2 } from "lucide-react"
import { VestConfirmationModal } from "./vest-confirmation-modal"

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

interface VestingSlot {
  id?: string
  user_uuid: string
  level: number
  slot_number: number // 1-based indexing
  shares: number
  status: "locked" | "claimable" | "claimed"
  created_at?: string
  updated_at?: string
}

interface VestingSlotProps {
  slot: VestingSlot
  slotIndex: number // 0-based UI index for display
  level: number
  onVest: (level: number, slotIndex: number, shares: number) => Promise<void>
  onClaim: (level: number, slotIndex: number) => Promise<void>
  availableShares: number
  isProcessing?: boolean
}

export function VestingSlot({
  slot,
  slotIndex,
  level,
  onVest,
  onClaim,
  availableShares,
  isProcessing = false,
}: VestingSlotProps) {
  const [showVestModal, setShowVestModal] = useState(false)
  const [isVesting, setIsVesting] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  const handleVest = async (shares: number) => {
    try {
      setIsVesting(true)
      // Pass slotIndex (0-based) to onVest, which will convert to 1-based slot_number
      await onVest(level, slotIndex, shares)
      setShowVestModal(false)
    } catch (error) {
      console.error("Error vesting shares:", error)
    } finally {
      setIsVesting(false)
    }
  }

  const handleClaim = async () => {
    try {
      setIsClaiming(true)
      // Pass slotIndex (0-based) to onClaim, which will convert to 1-based slot_number
      await onClaim(level, slotIndex)
    } catch (error) {
      console.error("Error claiming shares:", error)
    } finally {
      setIsClaiming(false)
    }
  }

  const getStatusIcon = () => {
    switch (slot.status) {
      case "locked":
        return <Lock className="w-4 h-4 text-yellow-500" />
      case "claimable":
        return <Unlock className="w-4 h-4 text-green-500" />
      case "claimed":
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Lock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    const statusConfig = {
      locked: { variant: "secondary" as const, className: "bg-yellow-600 text-yellow-100" },
      claimable: { variant: "default" as const, className: "bg-green-600 text-green-100" },
      claimed: { variant: "outline" as const, className: "bg-blue-600 text-blue-100" },
    }

    const config = statusConfig[slot.status] || statusConfig.locked

    return (
      <Badge variant={config.variant} className={config.className}>
        {slot.status.toUpperCase()}
      </Badge>
    )
  }

  const getProgressValue = () => {
    if (slot.status === "claimed") return 100
    if (slot.status === "claimable") return 75
    if (safeNumber(slot.shares) > 0) return 50
    return 0
  }

  const getProgressColor = () => {
    switch (slot.status) {
      case "claimed":
        return "bg-blue-500"
      case "claimable":
        return "bg-green-500"
      case "locked":
        return safeNumber(slot.shares) > 0 ? "bg-yellow-500" : "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2">Slot {slotIndex + 1}</span> {/* Display 1-based for user */}
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shares Display */}
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-100">{safeToFixed(slot.shares)}</div>
            <div className="text-xs text-slate-400">shares</div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={getProgressValue()}
              className="h-2"
              style={
                {
                  "--progress-background": getProgressColor(),
                } as React.CSSProperties
              }
            />
            <div className="text-xs text-slate-400 text-center">
              {slot.status === "claimed" && "Fully Claimed"}
              {slot.status === "claimable" && "Ready to Claim"}
              {slot.status === "locked" && safeNumber(slot.shares) > 0 && "Vested & Locked"}
              {slot.status === "locked" && safeNumber(slot.shares) === 0 && "Empty Slot"}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {slot.status === "locked" && (
              <Button
                onClick={() => setShowVestModal(true)}
                disabled={isProcessing || safeNumber(availableShares) <= 0}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                size="sm"
              >
                {isVesting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Vesting...
                  </>
                ) : (
                  "Vest Shares"
                )}
              </Button>
            )}

            {slot.status === "claimable" && (
              <Button
                onClick={handleClaim}
                disabled={isProcessing || isClaiming}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Claiming...
                  </>
                ) : (
                  "Claim Shares"
                )}
              </Button>
            )}

            {slot.status === "claimed" && (
              <Button disabled className="w-full bg-blue-600 text-white opacity-50" size="sm">
                <CheckCircle className="w-3 h-3 mr-1" />
                Claimed
              </Button>
            )}
          </div>

          {/* Slot Info */}
          <div className="text-xs text-slate-500 space-y-1">
            <div>Level: {level}</div>
            <div>Slot: {slot.slot_number}</div> {/* Show actual 1-based slot_number */}
            {slot.created_at && <div>Created: {new Date(slot.created_at).toLocaleDateString()}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Vest Confirmation Modal */}
      <VestConfirmationModal
        isOpen={showVestModal}
        onClose={() => setShowVestModal(false)}
        onConfirm={handleVest}
        availableShares={availableShares}
        level={level}
        slotNumber={slotIndex + 1} // Display 1-based slot number
        isProcessing={isVesting}
      />
    </>
  )
}
