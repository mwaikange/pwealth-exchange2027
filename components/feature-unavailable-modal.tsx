"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeatureUnavailableModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
}

export function FeatureUnavailableModal({ isOpen, onClose, featureName }: FeatureUnavailableModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Feature Not Available</h3>
          <p className="text-gray-300 mb-6">
            {featureName} is not available in the mobile version. Please use the desktop version for full functionality.
          </p>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  )
}
