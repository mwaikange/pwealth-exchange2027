"use client"

import { X } from "lucide-react"

interface FeatureUnavailableModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

export function FeatureUnavailableModal({
  isOpen,
  onClose,
  title = "Feature Unavailable on Mobile",
  message = "To access this feature, please login from a Desktop or Laptop device.",
}: FeatureUnavailableModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2d3a] rounded-lg p-5 w-full max-w-xs">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-300 mb-4">{message}</p>
        <button onClick={onClose} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">
          Got it
        </button>
      </div>
    </div>
  )
}
