"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"

interface SlidingNotificationProps {
  type: "success" | "error" | "warning" | "info"
  message: string
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function SlidingNotification({ type, message, isVisible, onClose, duration = 5000 }: SlidingNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(onClose, 300) // Wait for slide-out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible && !isAnimating) return null

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5" />
      case "error":
        return <XCircle className="h-5 w-5" />
      case "warning":
        return <AlertCircle className="h-5 w-5" />
      case "info":
        return <Info className="h-5 w-5" />
    }
  }

  const getColors = () => {
    switch (type) {
      case "success":
        return "bg-green-600 text-green-100 border-green-500"
      case "error":
        return "bg-red-600 text-red-100 border-red-500"
      case "warning":
        return "bg-yellow-600 text-yellow-100 border-yellow-500"
      case "info":
        return "bg-blue-600 text-blue-100 border-blue-500"
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out ${
        isAnimating ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className={`rounded-lg border-l-4 p-4 shadow-lg backdrop-blur-sm ${getColors()}`} role="alert">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsAnimating(false)
              setTimeout(onClose, 300)
            }}
            className="ml-4 inline-flex flex-shrink-0 justify-center items-center h-5 w-5 rounded-md hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <span className="sr-only">Close</span>
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
