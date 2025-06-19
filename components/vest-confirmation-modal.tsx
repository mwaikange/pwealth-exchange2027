"use client"

import type React from "react"

import { useState } from "react"
import { X, AlertTriangle, Loader2 } from "lucide-react"
import { VESTING_LEVELS } from "@/contexts/vesting-context"

interface VestConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number, level: number) => Promise<void>
  availableShares: number
  slotIndex: number
}

export function VestConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  availableShares,
  slotIndex,
}: VestConfirmationModalProps) {
  const [amount, setAmount] = useState("")
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    setAmount(value)
    setError("")
  }

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLevel(Number(e.target.value))
    setError("")
  }

  const validateAmount = () => {
    const numAmount = Number(amount)

    if (!amount || numAmount <= 0) {
      return "Please enter a valid amount"
    }

    if (numAmount > availableShares) {
      return `Insufficient shares. You have ${availableShares} shares available`
    }

    const levelConfig = VESTING_LEVELS[selectedLevel as keyof typeof VESTING_LEVELS]
    if (numAmount < levelConfig.min) {
      return `Minimum ${levelConfig.min} shares required for ${levelConfig.name} level`
    }

    if (numAmount > levelConfig.max) {
      return `Maximum ${levelConfig.max} shares allowed for ${levelConfig.name} level`
    }

    return null
  }

  const handleConfirm = async () => {
    const validationError = validateAmount()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsProcessing(true)
      await onConfirm(Number(amount), selectedLevel)
      setAmount("")
      setSelectedLevel(1)
      setError("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setAmount("")
      setSelectedLevel(1)
      setError("")
      onClose()
    }
  }

  const levelConfig = VESTING_LEVELS[selectedLevel as keyof typeof VESTING_LEVELS]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-md mx-4 border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-slate-100">Vest Shares - Slot {slotIndex + 1}</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200" disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Available Shares Info */}
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-sm text-slate-300">Available Shares (Pre-Hold)</div>
            <div className="text-2xl font-bold text-blue-400">{availableShares}</div>
          </div>

          {/* Level Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Vesting Level</label>
            <select
              value={selectedLevel}
              onChange={handleLevelChange}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100"
              disabled={isProcessing}
            >
              <option value={1}>Level 1 - Retail (1-50 shares)</option>
              <option value={2}>Level 2 - Small Business (51-500 shares)</option>
              <option value={3}>Level 3 - Corporate (501+ shares)</option>
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Number of Shares to Vest</label>
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Enter ${levelConfig.min}-${levelConfig.max === Number.POSITIVE_INFINITY ? "∞" : levelConfig.max} shares`}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400"
              disabled={isProcessing}
            />
            <div className="text-xs text-slate-400 mt-1">
              {levelConfig.name} level: {levelConfig.min} -{" "}
              {levelConfig.max === Number.POSITIVE_INFINITY ? "unlimited" : levelConfig.max} shares
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-md p-3 flex items-center text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {/* Warning Notice */}
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-md p-3">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <div className="font-medium mb-1">Important Notice:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Shares will be deducted from your Pre-Hold balance</li>
                  <li>• Vested shares will be locked and unusable for 5 days maximum</li>
                  <li>• After 5 days, you can claim shares to your Post-Hold balance</li>
                  <li>• This action cannot be reversed once confirmed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-100 py-2 rounded-md font-medium transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Vest"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
