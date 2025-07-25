"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Info, X } from "lucide-react"

interface NotificationProps {
  message: string
  type: "success" | "error" | "info"
  isVisible: boolean
  onClose: () => void
}

export function SlidingNotification({ message, type, isVisible, onClose }: NotificationProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!shouldRender) return null

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-600"
      case "error":
        return "bg-red-600"
      case "info":
        return "bg-blue-600"
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className={`${getBgColor()} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-80`}>
        {getIcon()}
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Hook for managing notifications
export function useNotification() {
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info"
    isVisible: boolean
  }>({
    message: "",
    type: "info",
    isVisible: false,
  })

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({
      message,
      type,
      isVisible: true,
    })
  }

  const hideNotification = () => {
    setNotification((prev) => ({
      ...prev,
      isVisible: false,
    }))
  }

  return {
    notification,
    showNotification,
    hideNotification,
  }
}
