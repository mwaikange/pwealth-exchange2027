"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, AlertCircle, Lock } from "lucide-react"

// Vesting levels configuration
const VESTING_LEVELS = {
  1: { name: "Retail", days: 5, minShares: 1, maxShares: 50 },
  2: { name: "Small Business", days: 30, minShares: 51, maxShares: 500 },
  3: { name: "Corporate", days: 90, minShares: 501, maxShares: Number.POSITIVE_INFINITY },
} as const

interface VestConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => Promise<void>
  availableShares: number
  slotIndex: number
  fixedLevel: number
}

export function VestConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  availableShares,
  slotIndex,
  fixedLevel,
}: VestConfirmationModalProps) {
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  // Get level configuration
  const levelConfig = VESTING_LEVELS[fixedLevel as keyof typeof VESTING_LEVELS]

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setError("")
      setIsProcessing(false)
    }
  }, [isOpen])

  // Safe number conversion
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Format shares to 4 decimal places
  const formatShares = (value: number): string => {
    return safeNumber(value).toFixed(4)
  }

  // Validate vesting amount
  const validateAmount = (value: number) => {
    if (value <= 0) {
      return "Amount must be greater than 0"
    }

    if (value > availableShares) {
      return "Insufficient shares in Hold Wallet (Pre-Hold)"
    }

    // Level-specific validation
    if (value < levelConfig.minShares) {
      return `${levelConfig.name} level requires minimum ${levelConfig.minShares} shares per slot`
    }

    if (levelConfig.maxShares !== Number.POSITIVE_INFINITY && value > levelConfig.maxShares) {
      return `${levelConfig.name} level allows maximum ${levelConfig.maxShares} shares per slot`
    }

    return null
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)
    setError("")

    if (value) {
      const numValue = safeNumber(value)
      const validationError = validateAmount(numValue)
      if (validationError) {
        setError(validationError)
      }
    }
  }

  const handleConfirm = async () => {
    const numAmount = safeNumber(amount)
    const validationError = validateAmount(numAmount)

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsProcessing(true)
      setError("")
      await onConfirm(numAmount)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to vest shares")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMaxClick = () => {
    const maxAllowed = Math.min(
      availableShares,
      levelConfig.maxShares === Number.POSITIVE_INFINITY ? availableShares : levelConfig.maxShares,
    )
    setAmount(maxAllowed.toString())
    setError("")
  }

  const numAmount = safeNumber(amount)
  const isValidAmount = numAmount > 0 && !validateAmount(numAmount)

  if (!levelConfig) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center text-slate-100">
            <Lock className="w-5 h-5 mr-2 text-blue-400" />
            Vest Shares
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Level Information */}
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">
                Level {fixedLevel} - {levelConfig.name}
              </span>
            </div>
            <div className="flex items-center text-slate-300 text-sm mb-2">
              <Clock className="w-4 h-4 mr-2 text-blue-400" />
              <span>Lock Period: {levelConfig.days} days</span>
            </div>
            <div className="text-xs text-slate-400">
              Allowed Range: {levelConfig.minShares}-
              {levelConfig.maxShares === Number.POSITIVE_INFINITY ? "unlimited" : levelConfig.maxShares} shares
            </div>
          </div>

          {/* Available Shares */}
          <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
            <div className="text-sm text-slate-300 mb-1">Available to Vest</div>
            <div className="text-lg font-semibold text-slate-100">{formatShares(availableShares)} shares</div>
            <div className="text-xs text-slate-400">From Hold Wallet (Pre-Hold)</div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Shares to Vest</label>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="0.0000"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={isProcessing}
                min="0"
                step="0.0001"
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleMaxClick}
                disabled={isProcessing}
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                MAX
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="bg-red-900 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-100">{error}</AlertDescription>
            </Alert>
          )}

          {/* Vesting Summary */}
          {isValidAmount && (
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Vesting Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shares to Lock:</span>
                  <span className="text-slate-100 font-medium">{formatShares(numAmount)} shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lock Period:</span>
                  <span className="text-slate-100 font-medium">{levelConfig.days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">After Vesting:</span>
                  <span className="text-slate-100 font-medium">{formatShares(numAmount)} shares (same amount)</span>
                </div>
              </div>
            </div>
          )}

          {/* Important Notice */}
          <Alert className="bg-blue-900 border-blue-700">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-100">
              <strong>Important:</strong> Vested shares will be locked for {levelConfig.days} days and cannot be traded
              until the vesting period completes. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValidAmount || isProcessing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? "Vesting..." : "Vest Shares"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
