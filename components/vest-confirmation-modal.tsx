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
import { Loader2, AlertCircle, Lock, Clock, Info } from "lucide-react"

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
  isProcessing = false,
  loading = false,
}: VestConfirmationModalProps) {
  const [shares, setShares] = useState("")
  const [error, setError] = useState("")

  // Safe conversion of props
  const safeAvailableShares = safeNumber(availableShares)
  const safeLevel = safeNumber(level)
  const safeSlotNumber = safeNumber(slotNumber)

  // Get level information
  const getLevelInfo = (levelNum: number) => {
    switch (levelNum) {
      case 1:
        return { name: "Retail", days: 5, range: "1-50", color: "text-blue-400" }
      case 2:
        return { name: "Small Business", days: 30, range: "51-500", color: "text-green-400" }
      case 3:
        return { name: "Corporate", days: 90, range: "501+", color: "text-purple-400" }
      default:
        return { name: "Retail", days: 5, range: "1-50", color: "text-blue-400" }
    }
  }

  const levelInfo = getLevelInfo(safeLevel)

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

    // Level-specific validation
    if (safeLevel === 1 && (shareAmount < 1 || shareAmount > 50)) {
      setError("Retail level: You can vest between 1-50 shares per slot")
      return
    }
    if (safeLevel === 2 && (shareAmount < 51 || shareAmount > 500)) {
      setError("Small Business level: You can vest between 51-500 shares per slot")
      return
    }
    if (safeLevel === 3 && shareAmount < 501) {
      setError("Corporate level: You must vest at least 501 shares per slot")
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
    // Set max based on level limits and available shares
    let maxAllowed = safeAvailableShares

    if (safeLevel === 1) {
      maxAllowed = Math.min(50, safeAvailableShares)
    } else if (safeLevel === 2) {
      maxAllowed = Math.min(500, safeAvailableShares)
    }
    // Level 3 has no upper limit

    setShares(safeToFixed(maxAllowed))
    setError("")
  }

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
            Vest shares into Level {safeToFixed(safeLevel, 0)}, Slot {safeToFixed(safeSlotNumber, 0)}. Shares will be
            locked for {levelInfo.days} days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Level Information */}
          <div className="p-3 bg-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">
                  Level {safeToFixed(safeLevel, 0)} - {levelInfo.name}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-400 space-y-1">
              <div>Lock Period: {levelInfo.days} days</div>
              <div>Allowed Range: {levelInfo.range} shares per slot</div>
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

          {/* Vesting Summary */}
          {safeNumber(shares) > 0 && (
            <div className="p-3 bg-blue-900/30 border border-blue-600/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-400">Vesting Summary</span>
                <Info className="h-4 w-4 text-blue-400" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Shares to Lock:</span>
                  <span className="text-slate-200">{safeToFixed(shares)} shares</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lock Period:</span>
                  <span className="text-slate-200">{levelInfo.days} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">After Vesting:</span>
                  <span className="text-slate-200">{safeToFixed(shares)} shares (same amount)</span>
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

          {/* Important Notice */}
          <div className="p-3 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
            <div className="text-sm text-yellow-400">
              <strong>Important:</strong> Vesting is a mandatory holding period. Your shares will be locked for{" "}
              {levelInfo.days} days and cannot be traded until the vesting period completes. You will receive the same
              number of shares back after the lock period ends.
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
