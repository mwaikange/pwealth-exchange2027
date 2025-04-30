"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

type Notification = {
  id: string
  message: string
  created_at?: string
}

export function SlidingNotification() {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Fetch notifications from the API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/notifications/active")

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`)
        }

        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
          console.log(`Received ${data.length} active notifications at ${new Date().toLocaleTimeString()}`)
          setNotifications(data)
        } else {
          console.log(`No active notifications found at ${new Date().toLocaleTimeString()}`)
          setNotifications([])
        }
        setLastUpdated(new Date())
      } catch (err) {
        console.error("Error fetching notifications:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setNotifications([])
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchNotifications()

    // Refresh notifications every 3 minutes (changed from 5 minutes)
    const refreshInterval = setInterval(fetchNotifications, 3 * 60 * 1000)

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval)
  }, [])

  // Handle notification rotation with visibility timing
  useEffect(() => {
    if (notifications.length <= 0 || isLoading) return

    // For a single notification, just show it continuously
    if (notifications.length === 1) {
      setIsVisible(true)
      return
    }

    // Function to handle the rotation cycle for multiple notifications
    const rotateNotifications = () => {
      // Show the current notification
      setIsVisible(true)

      // After 25 seconds, hide the notification
      const hideTimeout = setTimeout(() => {
        setIsVisible(false)

        // After 4 seconds of being hidden, show the next notification
        const showNextTimeout = setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % notifications.length)
          setIsVisible(true)
        }, 4000) // 4 second gap

        return () => clearTimeout(showNextTimeout)
      }, 25000) // 25 seconds display time

      return () => clearTimeout(hideTimeout)
    }

    // Start the rotation cycle
    const cleanup = rotateNotifications()

    // Set up an interval to continue the cycle
    const interval = setInterval(() => {
      cleanup()
      rotateNotifications()
    }, 29000) // 25 seconds display + 4 seconds gap

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [notifications.length, isLoading])

  // If loading or no notifications, don't show anything
  if (isLoading || notifications.length === 0) {
    return null
  }

  // Get current notification message
  const currentMessage = notifications[currentIndex]?.message || ""

  // If no message, don't show anything
  if (!currentMessage) {
    return null
  }

  // Return the notification component with the yellow bar always visible
  return (
    <div className="w-full bg-yellow-500 text-black px-4 py-2 text-sm font-semibold overflow-hidden relative">
      {isVisible ? (
        <div className="animate-slide-message whitespace-nowrap">{currentMessage}</div>
      ) : (
        <div className="opacity-0 h-4">Waiting for next message</div>
      )}
    </div>
  )
}
