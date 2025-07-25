"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, AlertCircle, Clock } from "lucide-react"
import { useVesting } from "@/contexts/vesting-context"

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

  const { validateVestingAmount, getHoldPeriodForLevel } = useVesting()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setError("")
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Get level information
  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1:
        return { name: "Retail", range: "1-50", color: "text-blue-400" }
      case 2:
        return { name: "Small Business", range: "51-500", color: "text-green-400" }
      case 3:
        return { name: "Corporate", range: "501+", color: "text-purple-400" }
      default:
        return { name: "Retail", range: "1-50", color: "text-blue-400" }
    }
  }

  const levelInfo = getLevelInfo(fixedLevel)
  const holdPeriod = getHoldPeriodForLevel(fixedLevel)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const numAmount = Number.parseFloat(amount)

    // Validate amount
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (numAmount > availableShares) {
      setError("Amount exceeds available shares")
      return
    }

    // Level-specific validation
    const validation = validateVestingAmount(numAmount, fixedLevel)
    if (!validation.valid) {
      setError(validation.message || "Invalid amount")
      return
    }

    try {
      setIsSubmitting(true)
      await onConfirm(numAmount)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to vest shares")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = () => {
    // Set to maximum allowed for the level, but not more than available
    let maxForLevel: number
    switch (fixedLevel) {
      case 1:
        maxForLevel = Math.min(50, availableShares)
        break
      case 2:
        maxForLevel = Math.min(500, availableShares)
        break
      case 3:
        maxForLevel = availableShares // No upper limit for corporate
        break
      default:
        maxForLevel = Math.min(50, availableShares)
    }
    setAmount(maxForLevel.toString())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            Vest Shares - {levelInfo.name} Slot {slotIndex + 1}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Level Information */}
          <div className="mb-6 p-4 bg-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300">Level:</span>
              <span className={`font-medium ${levelInfo.color}`}>{levelInfo.name}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300">Allowed Range:</span>
              <span className="text-slate-100">{levelInfo.range} shares</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Hold Period:</span>
              <div className="flex items-center text-slate-100">
                <Clock className="w-4 h-4 mr-1" />
                {holdPeriod} days
              </div>
            </div>
          </div>

          {/* Available Shares */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Available (Pre-Hold):</span>
              <span className="text-blue-400 font-medium">{availableShares.toFixed(4)} shares</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
              Amount to Vest
            </label>
            <div className="relative">
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                step="0.0001"
                min="0"
                max={availableShares}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                disabled={isSubmitting}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-600/30 rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Warning */}
          <div className="mb-6 p-3 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-400 text-sm">
                <p className="font-medium mb-1">Important:</p>
                <p>
                  Shares will be locked for {holdPeriod} days. You cannot access them until the vesting period
                  completes.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !amount}
            >
              {isSubmitting ? "Vesting..." : "Confirm Vest"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
