"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useTransactions } from "@/contexts/transaction-context"

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { transactions } = useTransactions()

  // Filter for only IN-PWT RECEIPT, IN-AFT GIFT, and AFT Top-Up transactions
  const notificationTransactions = transactions
    .filter((tx) => tx.type === "IN-PWT RECEIPT" || tx.type === "IN-AFT GIFT" || tx.type === "AFT Top-Up")
    .slice(0, 5) // Show only the 5 most recent

  const unreadCount = notificationTransactions.length > 0 ? notificationTransactions.length : 0

  return (
    <div className="relative">
      <button
        className="relative p-1 rounded-full hover:bg-gray-700 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1e2130] border border-gray-700 rounded-md shadow-lg z-50">
          <div className="flex justify-between items-center p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium">Notifications</h3>
            <button className="text-xs text-gray-400 hover:text-white" onClick={() => setIsOpen(false)}>
              Close All
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificationTransactions.length > 0 ? (
              notificationTransactions.map((tx, index) => (
                <div key={index} className="p-3 border-b border-gray-700 relative">
                  <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-white"
                    onClick={() => {
                      // Remove this notification logic would go here
                    }}
                  >
                    ×
                  </button>

                  <div className="font-medium">
                    {tx.type === "IN-PWT RECEIPT"
                      ? "PWT Received"
                      : tx.type === "IN-AFT GIFT"
                        ? "AFT Gift Received"
                        : "AFT Top-Up"}
                  </div>

                  <div className="text-sm text-gray-400">
                    You received {tx.amount} {tx.type.includes("PWT") ? "PWT" : "AFT"}
                    {tx.amountUsd ? ` (${tx.amountUsd} USD)` : ""}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    From: {tx.type === "AFT Top-Up" ? "Card Purchase" : tx.from || "anonymous@example.com"}
                    <br />
                    {tx.date || "11 May, 11:50am"}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No new notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
