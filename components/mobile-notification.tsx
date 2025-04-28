"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

export function MobileNotification() {
  const [isVisible, setIsVisible] = useState(true)
  const [hasSeenNotification, setHasSeenNotification] = useState(false)

  useEffect(() => {
    // Check if user has already seen the notification
    const hasSeenNotif = localStorage.getItem("hasSeenMobileNotification")
    if (hasSeenNotif) {
      setHasSeenNotification(true)
      setIsVisible(false)
    }
  }, [])

  const dismissNotification = () => {
    setIsVisible(false)
    // Save to localStorage so we don't show it again
    localStorage.setItem("hasSeenMobileNotification", "true")
    setHasSeenNotification(true)
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-3 z-50">
      <div className="flex items-start">
        <div className="flex-1 text-sm">To experience full features, please login from a Desktop or Laptop device.</div>
        <button onClick={dismissNotification} className="ml-2 p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
