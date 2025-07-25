"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, Lock, Gift, Calendar, TrendingUp } from "lucide-react"
import { VestConfirmationModal } from "./vest-confirmation-modal"

// Safe number conversion with fallback
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Safe toFixed with fallback
const safeToFixed = (value: any, decimals = 2): string => {
  const num = safeNumber(value)
  return num.toFixed(decimals)
}

// Safe date formatting
const formatDate = (dateValue: any): string => {
  try {
    if (!dateValue) return "Not set"
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return "Invalid date"
    return date.toLocaleDateString()
  } catch (error) {
    return "Invalid date"
  }
}

// Safe progress calculation with bounds
const calculateProgress = (progress: any): number => {
  const num = safeNumber(progress)
  return Math.min(Math.max(num, 0), 100) // Ensure between 0-100
}

interface VestingSlotProps {
  slot: {
    id?: string | number
    level?: number | string
    amount?: number | string
    status?: string
    progress?: number | string
    start_date?: string | Date
    end_date?: string | Date
    multiplier?: number | string
    days_remaining?: number | string
    total_days?: number | string
  }
  slotIndex?: number | string
  onVest?: (level: number, amount: number) => void
  onClaim?: (slotId: string | number) => void
  loading?: boolean
}

// Level information lookup with safe access
const getLevelInfo = (level: any) => {
  const safeLevel = safeNumber(level)

  const levelMap: Record<number, { name: string; color: string; icon: any; multiplier: number; days: number }> = {
    1: { name: "Bronze", color: "text-amber-600", icon: Gift, multiplier: 1.1, days: 30 },
    2: { name: "Silver", color: "text-gray-600", icon: TrendingUp, multiplier: 1.25, days: 60 },
    3: { name: "Gold", color: "text-yellow-600", icon: CheckCircle, multiplier: 1.5, days: 90 },
    4: { name: "Platinum", color: "text-purple-600", icon: Lock, multiplier: 2.0, days: 180 },
    5: { name: "Diamond", color: "text-blue-600", icon: Calendar, multiplier: 3.0, days: 365 },
  }

  return (
    levelMap[safeLevel] || {
      name: "Unknown",
      color: "text-gray-500",
      icon: Clock,
      multiplier: 1.0,
      days: 0,
    }
  )
}

export function VestingSlot({ slot, slotIndex = 0, onVest, onClaim, loading = false }: VestingSlotProps) {
  const [showVestModal, setShowVestModal] = useState(false)

  // Safe data extraction with fallbacks
  const slotId = slot.id || `slot-${safeNumber(slotIndex)}`
  const level = safeNumber(slot.level)
  const amount = safeNumber(slot.amount)
  const status = slot.status || "empty"
  const progress = calculateProgress(slot.progress)
  const startDate = formatDate(slot.start_date)
  const endDate = formatDate(slot.end_date)
  const multiplier = safeNumber(slot.multiplier)
  const daysRemaining = safeNumber(slot.days_remaining)
  const totalDays = safeNumber(slot.total_days)

  // Get level information
  const levelInfo = getLevelInfo(level)
  const IconComponent = levelInfo.icon

  // Calculate expected return with safe math
  const expectedReturn = amount * (multiplier || levelInfo.multiplier)

  // Handle vest action
  const handleVest = () => {
    if (onVest && level > 0) {
      setShowVestModal(true)
    }
  }

  // Handle claim action
  const handleClaim = () => {
    if (onClaim && slotId) {
      onClaim(slotId)
    }
  }

  // Confirm vest from modal
  const handleConfirmVest = (vestAmount: number) => {
    if (onVest && level > 0) {
      onVest(level, vestAmount)
      setShowVestModal(false)
    }
  }

  // Render based on status
  const renderSlotContent = () => {
    switch (status) {
      case "empty":
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <IconComponent className={`h-8 w-8 ${levelInfo.color}`} />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Level {safeToFixed(level, 0)} - {levelInfo.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {safeToFixed(levelInfo.multiplier, 1)}x multiplier • {levelInfo.days} days
            </p>
            <Button onClick={handleVest} disabled={loading} className="w-full">
              {loading ? "Processing..." : "Vest Shares"}
            </Button>
          </div>
        )

      case "locked":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold">
                  Level {safeToFixed(level, 0)} - {levelInfo.name}
                </span>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Locked
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Amount:</span>
                <div className="font-semibold">{safeToFixed(amount, 4)} shares</div>
              </div>
              <div>
                <span className="text-gray-600">Expected Return:</span>
                <div className="font-semibold text-green-600">{safeToFixed(expectedReturn, 4)} shares</div>
              </div>
              <div>
                <span className="text-gray-600">Start Date:</span>
                <div className="font-semibold">{startDate}</div>
              </div>
              <div>
                <span className="text-gray-600">End Date:</span>
                <div className="font-semibold">{endDate}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{safeToFixed(progress, 1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-gray-600 text-center">
                {daysRemaining > 0 ? `${safeToFixed(daysRemaining, 0)} days remaining` : "Vesting complete"}
              </div>
            </div>
          </div>
        )

      case "claim":
      case "claimable":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">
                  Level {safeToFixed(level, 0)} - {levelInfo.name}
                </span>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Ready to Claim
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original Amount:</span>
                <div className="font-semibold">{safeToFixed(amount, 4)} shares</div>
              </div>
              <div>
                <span className="text-gray-600">Claimable Amount:</span>
                <div className="font-semibold text-green-600">{safeToFixed(expectedReturn, 4)} shares</div>
              </div>
              <div>
                <span className="text-gray-600">Multiplier:</span>
                <div className="font-semibold">{safeToFixed(multiplier || levelInfo.multiplier, 1)}x</div>
              </div>
              <div>
                <span className="text-gray-600">Completed:</span>
                <div className="font-semibold">{endDate}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={100} className="h-2" />
              <div className="text-xs text-green-600 text-center font-medium">Vesting Complete! Ready to claim.</div>
            </div>

            <Button onClick={handleClaim} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? "Claiming..." : `Claim ${safeToFixed(expectedReturn, 4)} Shares`}
            </Button>
          </div>
        )

      case "claimed":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">
                  Level {safeToFixed(level, 0)} - {levelInfo.name}
                </span>
              </div>
              <Badge variant="outline" className="border-blue-200 text-blue-800">
                Claimed
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original Amount:</span>
                <div className="font-semibold">{safeToFixed(amount, 4)} shares</div>
              </div>
              <div>
                <span className="text-gray-600">Claimed Amount:</span>
                <div className="font-semibold text-blue-600">{safeToFixed(expectedReturn, 4)} shares</div>
              </div>
              <div>
                <span className="text-gray-600">Multiplier:</span>
                <div className="font-semibold">{safeToFixed(multiplier || levelInfo.multiplier, 1)}x</div>
              </div>
              <div>
                <span className="text-gray-600">Claimed On:</span>
                <div className="font-semibold">{endDate}</div>
              </div>
            </div>

            <div className="text-center py-4">
              <div className="text-sm text-gray-600">This slot is now available for new vesting</div>
              <Button onClick={handleVest} disabled={loading} variant="outline" className="mt-2 bg-transparent">
                Vest Again
              </Button>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <div className="text-gray-500">Unknown status: {status}</div>
          </div>
        )
    }
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">Slot {safeToFixed(slotIndex, 0)}</span>
            <div className="flex items-center space-x-2">
              <IconComponent className={`h-5 w-5 ${levelInfo.color}`} />
              {status !== "empty" && (
                <Badge variant="outline" className="text-xs">
                  {safeToFixed(levelInfo.multiplier, 1)}x
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>{renderSlotContent()}</CardContent>
      </Card>

      {/* Vest Confirmation Modal */}
      <VestConfirmationModal
        isOpen={showVestModal}
        onClose={() => setShowVestModal(false)}
        onConfirm={handleConfirmVest}
        level={level}
        levelInfo={levelInfo}
        loading={loading}
      />
    </>
  )
}
