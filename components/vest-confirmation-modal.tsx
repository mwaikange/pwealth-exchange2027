"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Lock, TrendingUp, Gift } from "lucide-react"

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

interface VestConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shares: number) => Promise<void>
  availableShares?: number | string
  level?: number | string
  slotNumber?: number | string
  levelInfo?: {
    name?: string
    multiplier?: number
    days?: number
    color?: string
  }
  isProcessing?: boolean
  loading?: boolean
}

export function VestConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  availableShares = 0,
  level = 1,
  slotNumber = 1,
  levelInfo,
  isProcessing = false,
  loading = false,
}: VestConfirmationModalProps) {
  const [shares, setShares] = useState("")
  const [error, setError] = useState("")

  // Safe conversion of props
  const safeAvailableShares = safeNumber(availableShares)
  const safeLevel = safeNumber(level)
  const safeSlotNumber = safeNumber(slotNumber)

  // Default level info if not provided
  const defaultLevelInfo = {
    name: "Bronze",
    multiplier: 1.1,
    days: 30,
    color: "text-amber-600",
  }

  const currentLevelInfo = levelInfo || defaultLevelInfo
  const safeMultiplier = safeNumber(currentLevelInfo.multiplier) || 1.1
  const safeDays = safeNumber(currentLevelInfo.days) || 30

  const handleConfirm = async () => {
    const shareAmount = safeNumber(shares)

    // Validation
    if (shareAmount <= 0) {
      setError("Please enter a valid positive number of shares")
      return
    }

    if (shareAmount > safeAvailableShares) {
      setError(`You only have ${safeToFixed(safeAvailableShares)} shares available`)
      return
    }

    try {
      setError("")
      await onConfirm(shareAmount)
      setShares("")
    } catch (err: any) {
      setError(err?.message || "Failed to vest shares")
    }
  }

  const handleClose = () => {
    if (!isProcessing && !loading) {
      setShares("")
      setError("")
      onClose()
    }
  }

  const setMaxShares = () => {
    setShares(safeToFixed(safeAvailableShares))
    setError("")
  }

  // Calculate expected return
  const expectedReturn = safeNumber(shares) * safeMultiplier
  const bonusShares = expectedReturn - safeNumber(shares)

  const isLoading = isProcessing || loading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center text-slate-100">
            <Lock className="w-5 h-5 mr-2 text-yellow-500" />
            Vest Shares
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Vest shares into Level {safeToFixed(safeLevel, 0)}, Slot {safeToFixed(safeSlotNumber, 0)}. Vested shares
            will be locked for {safeDays} days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Level Information */}
          <div className="p-3 bg-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Gift className="h-4 w-4 text-amber-500" />
                <span className="font-medium">
                  Level {safeToFixed(safeLevel, 0)} - {currentLevelInfo.name || "Unknown"}
                </span>
              </div>
              <Badge variant="outline" className="bg-slate-600 text-slate-200">
                {safeToFixed(safeMultiplier, 1)}x
              </Badge>
            </div>
            <div className="text-sm text-slate-400 space-y-1">
              <div>Multiplier: {safeToFixed(safeMultiplier, 1)}x</div>
              <div>Lock Period: {safeDays} days</div>
            </div>
          </div>

          {/* Available Shares Info */}
          <div className="p-3 bg-slate-700 rounded-lg">
            <div className="text-sm text-slate-400">Available to Vest</div>
            <div className="text-lg font-semibold text-slate-100">{safeToFixed(safeAvailableShares)} shares</div>
          </div>

          {/* Shares Input */}
          <div className="space-y-2">
            <Label htmlFor="shares" className="text-slate-300">
              Shares to Vest
            </Label>
            <div className="flex space-x-2">
              <Input
                id="shares"
                type="number"
                step="0.0001"
                min="0"
                max={safeAvailableShares}
                value={shares}
                onChange={(e) => {
                  setShares(e.target.value)
                  setError("")
                }}
                placeholder="0.0000"
                className="bg-slate-700 border-slate-600 text-slate-100"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={setMaxShares}
                disabled={isLoading || safeAvailableShares <= 0}
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                MAX
              </Button>
            </div>
          </div>

          {/* Expected Return */}
          {safeNumber(shares) > 0 && (
            <div className="p-3 bg-green-900/30 border border-green-600/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-400">Expected Return</span>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Original Amount:</span>
                  <span className="text-slate-200">{safeToFixed(shares)} shares</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Bonus ({safeToFixed((safeMultiplier - 1) * 100, 1)}%):</span>
                  <span className="text-green-400">+{safeToFixed(bonusShares)} shares</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-slate-600 pt-1">
                  <span className="text-slate-200">Total Return:</span>
                  <span className="text-green-400">{safeToFixed(expectedReturn)} shares</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="bg-red-900/30 border-red-600/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning Info */}
          <div className="p-3 bg-blue-900/30 border border-blue-600/30 rounded-lg">
            <div className="text-sm text-blue-400">
              <strong>Important:</strong> Vested shares will be locked for {safeDays} days and cannot be traded until
              the vesting period completes. This action cannot be undone.
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !shares || safeNumber(shares) <= 0}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Vesting...
              </>
            ) : (
              "Vest Shares"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
