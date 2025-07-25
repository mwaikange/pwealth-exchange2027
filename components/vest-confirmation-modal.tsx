"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

  // Get level info
  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1:
        return { name: "Retail", days: 5, min: 1, max: 50 }
      case 2:
        return { name: "Small Business", days: 30, min: 51, max: 500 }
      case 3:
        return { name: "Corporate", days: 90, min: 501, max: Number.POSITIVE_INFINITY }
      default:
        return { name: "Retail", days: 5, min: 1, max: 50 }
    }
  }

  const levelInfo = getLevelInfo(fixedLevel)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setError("")
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Validate amount
  const validateAmount = (value: string): string => {
    const numValue = Number.parseFloat(value)

    if (!value || isNaN(numValue)) {
      return "Please enter a valid amount"
    }

    if (numValue <= 0) {
      return "Amount must be greater than 0"
    }

    if (numValue > availableShares) {
      return `Insufficient balance. Available: ${availableShares.toFixed(4)} shares`
    }

    // Level-based validation
    if (numValue < levelInfo.min) {
      return `${levelInfo.name} level minimum: ${levelInfo.min} shares`
    }

    if (levelInfo.max !== Number.POSITIVE_INFINITY && numValue > levelInfo.max) {
      return `${levelInfo.name} level maximum: ${levelInfo.max} shares`
    }

    return ""
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)

    // Clear error when user starts typing
    if (error) {
      setError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

  if (!isOpen) return null

  const numAmount = Number.parseFloat(amount) || 0
  const isValid = !validateAmount(amount) && numAmount > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Vest Shares - Slot {slotIndex + 1}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Available Balance */}
        <div className="mb-4 p-3 bg-slate-700 rounded-lg">
          <div className="text-slate-300 text-sm">Available Balance</div>
          <div className="text-xl font-bold text-blue-400">{availableShares.toFixed(4)}</div>
          <div className="text-slate-500 text-xs">shares</div>
        </div>

        {/* Level Info */}
        <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
          <div className="text-blue-300 text-sm font-medium">Vesting Level (Fixed)</div>
          <div className="text-blue-100 font-semibold">
            Level {fixedLevel} - {levelInfo.name}
          </div>
          <div className="text-blue-300 text-xs">
            {levelInfo.min}-{levelInfo.max === Number.POSITIVE_INFINITY ? "∞" : levelInfo.max} shares
          </div>
        </div>

        {/* Hold Period */}
        <div className="mb-4 p-2 bg-yellow-900 bg-opacity-30 rounded border border-yellow-700">
          <div className="text-yellow-300 text-xs font-medium">
            ⚠️ {levelInfo.name} Hold Period: {levelInfo.days} days
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">Number of Shares to Vest</label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              max={availableShares}
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Enter ${levelInfo.min}-${levelInfo.max === Number.POSITIVE_INFINITY ? "∞" : levelInfo.max} shares`}
              className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
              disabled={isSubmitting}
            />
            {error && (
              <div className="mt-2 text-red-400 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}
          </div>

          {/* Range Info */}
          <div className="mb-4 text-slate-400 text-xs">
            {levelInfo.name} level: {levelInfo.min}-{levelInfo.max === Number.POSITIVE_INFINITY ? "∞" : levelInfo.max}{" "}
            shares
          </div>

          {/* Important Notice */}
          <div className="mb-6 p-3 bg-orange-900 bg-opacity-30 rounded border border-orange-700">
            <div className="text-orange-300 text-xs font-medium mb-2">⚠️ Important Notice:</div>
            <ul className="text-orange-200 text-xs space-y-1">
              <li>• Shares deducted from Pre-Hold balance</li>
              <li>• Locked for {levelInfo.days} days</li>
              <li>• Claim to Post-Hold after {levelInfo.days} days</li>
              <li>• Action cannot be reversed</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`flex-1 ${
                isValid ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-600 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? "Vesting..." : `Vest ${numAmount > 0 ? numAmount.toFixed(4) : ""}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
