"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle } from "lucide-react"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const levelConfig = {
    1: { name: "Retail", days: 5, min: 1, max: 50 },
    2: { name: "Small Business", days: 30, min: 51, max: 500 },
    3: { name: "Corporate", days: 90, min: 501, max: Number.POSITIVE_INFINITY },
  }

  const currentLevel = levelConfig[fixedLevel as keyof typeof levelConfig]

  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setError("")
      setIsSubmitting(false)
    }
  }, [isOpen])

  const validateAmount = (value: string) => {
    const numValue = Number.parseFloat(value)

    if (isNaN(numValue) || numValue <= 0) {
      return "Please enter a valid amount"
    }

    if (numValue > availableShares) {
      return "Insufficient shares in Pre-Hold wallet"
    }

    if (numValue < currentLevel.min) {
      return `${currentLevel.name} level requires minimum ${currentLevel.min} shares`
    }

    if (currentLevel.max !== Number.POSITIVE_INFINITY && numValue > currentLevel.max) {
      return `${currentLevel.name} level allows maximum ${currentLevel.max} shares`
    }

    return ""
  }

  const handleSubmit = async () => {
    const validationError = validateAmount(amount)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      await onConfirm(Number.parseFloat(amount))
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to vest shares")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)
    if (error) {
      setError("")
    }
  }

  if (!isOpen) return null

  const getPlaceholderText = () => {
    if (currentLevel.max === Number.POSITIVE_INFINITY) {
      return `Enter ${currentLevel.min}+ shares`
    }
    return `Enter ${currentLevel.min}-${currentLevel.max} shares`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Vest Shares - Slot {slotIndex + 1}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Available Balance */}
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="text-slate-400 text-sm">Available Pre-Hold Balance</div>
            <div className="text-2xl font-bold text-blue-400">{availableShares.toFixed(4)}</div>
            <div className="text-slate-500 text-xs">shares</div>
          </div>

          {/* Level Info */}
          <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
            <div className="text-blue-400 font-medium">Vesting Level (Fixed)</div>
            <div className="text-white font-semibold">
              Level {fixedLevel} - {currentLevel.name}
            </div>
            <div className="text-slate-300 text-sm">{currentLevel.days} days hold period</div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Number of Shares to Vest</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder={getPlaceholderText()}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              step="0.0001"
              min="0"
              max={availableShares}
            />
            <div className="text-slate-400 text-xs mt-1">
              {currentLevel.name} level -{" "}
              {currentLevel.min === currentLevel.max
                ? currentLevel.min
                : `${currentLevel.min}-${currentLevel.max === Number.POSITIVE_INFINITY ? "∞" : currentLevel.max}`}{" "}
              shares
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-3 flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Important Notice */}
          <div className="bg-orange-900/30 border border-orange-600/30 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 text-orange-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-orange-300 text-sm">
                <div className="font-medium mb-1">Important Notice:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Shares deducted from Pre-Hold balance</li>
                  <li>• Locked for {currentLevel.days} days</li>
                  <li>• Claim to Post-Hold after {currentLevel.days} days</li>
                  <li>• Action cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !!error}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? "Vesting..." : `Vest ${amount || "0"}`}
          </button>
        </div>
      </div>
    </div>
  )
}
