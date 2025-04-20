"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"

interface Notification {
  id: string
  type: string
  sender: string
  amount: string
  date: string
  read: boolean
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { transactions } = useTransactions()
  const { user } = useAuth()

  // Filter transactions to only include incoming transactions
  useEffect(() => {
    if (!transactions) return

    const incomingTransactions = transactions.filter(
      (tx) => tx.type === "IN-PWT RECEIPT" || tx.type === "IN-AFT GIFT" || tx.type === "BUY-AFT RECEIPT",
    )

    // Convert to notifications format
    const newNotifications = incomingTransactions.map((tx) => {
      // Format the type for display
      let displayType
      if (tx.type === "IN-PWT RECEIPT") {
        displayType = "PWT Received"
      } else if (tx.type === "IN-AFT GIFT") {
        displayType = "AFT Gift Received"
      } else if (tx.type === "BUY-AFT RECEIPT") {
        displayType = "AFT Top-Up"
      }

      // Format the sender
      const sender = tx.type === "BUY-AFT RECEIPT" ? "Card Purchase" : tx.sender || "anonymous@example.com"

      // Format the amount
      const amount = `${tx.amount} ${tx.account === "PWT Invest" ? "PWT" : "AFT"} (${tx.amountUsd} USD)`

      return {
        id: tx.id,
        type: displayType,
        sender,
        amount,
        date: tx.date,
        read: false,
      }
    })

    setNotifications(newNotifications)
  }, [transactions])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  return (
    <div className="relative">
      <button className="relative p-2 rounded-full hover:bg-gray-800" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1e2130] rounded-md shadow-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-gray-700">
            <h3 className="font-medium text-sm">Notifications</h3>
            <div className="flex items-center space-x-2">
              <button onClick={markAllAsRead} className="text-xs text-gray-400 hover:text-white">
                Close All
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No notifications</div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-700 relative ${notification.read ? "opacity-70" : ""}`}
                  >
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                    <div className="font-medium text-sm">{notification.type}</div>
                    <div className="text-xs text-gray-400">You received {notification.amount}</div>
                    <div className="text-xs text-gray-400">From: {notification.sender}</div>
                    <div className="text-xs text-gray-400 mt-1">{notification.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
