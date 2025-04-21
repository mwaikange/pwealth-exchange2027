"use client"

import { Bell, ChevronLeft, X } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import Link from "next/link"
import { useState } from "react"
import { AFTPurchaseModal } from "./aft-purchase-modal"

export function DashboardHeader() {
  const { pwtInvestBalance, pwtCashoutBalance, aftBalance, loading } = useWallet()
  const { transactions } = useTransactions()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAFTModal, setShowAFTModal] = useState(false)

  // Filter notifications - IN-PWT RECEIPT, IN-AFT GIFT, and BUY-AFT RECEIPT transactions
  const notifications = transactions
    .filter((tx) => tx.type === "IN-PWT RECEIPT" || tx.type === "IN-AFT GIFT" || tx.type === "BUY-AFT RECEIPT")
    .slice(0, 5) // Show only the 5 most recent

  return (
    <div className="w-full">
      {/* Main header */}
      <header className="bg-[#1e2130] h-[60px] flex items-center px-4">
        <div className="flex items-center">
          <div className="w-10 h-10 relative mr-3">
            <img
              src="/peerWealth_Cursor.png"
              alt="Peer Wealth Logo"
              className="absolute inset-0 rounded-full w-full h-full object-cover"
            />
          </div>
          <Link href="/dashboard" className="flex items-center">
            <ChevronLeft className="h-5 w-5 mr-2" />
            <h1 className="text-xl font-bold">OVERVIEW</h1>
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-3">
          <div className="relative">
            <button
              className="relative p-2 rounded-full hover:bg-gray-800"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs">
                {notifications.length > 0 ? (notifications.length > 9 ? "9+" : notifications.length) : "0"}
              </span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[#2a2d3a] rounded-md shadow-lg z-10 overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-gray-700">
                  <h3 className="font-medium">Notifications</h3>
                  <button
                    className="text-gray-400 hover:text-white text-xs"
                    onClick={() => setShowNotifications(false)}
                  >
                    Close All
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-3 border-b border-gray-700 relative">
                        <button
                          className="absolute top-2 right-2 text-gray-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Remove this notification from the list
                            const updatedNotifications = notifications.filter((n) => n.id !== notification.id)
                            // You would typically update this in your context
                            // For now we'll just close the dropdown
                            setShowNotifications(false)
                          }}
                        >
                          <X size={16} />
                        </button>

                        <div className="font-medium">
                          {notification.type === "IN-PWT RECEIPT"
                            ? "PWT Received"
                            : notification.type === "IN-AFT GIFT"
                              ? "AFT Gift Received"
                              : "AFT Top-Up"}
                        </div>
                        <div className="text-sm text-gray-300">
                          You received {notification.amount} {notification.type.includes("PWT") ? "PWT" : "AFT"}
                          {notification.type.includes("PWT") ? ` (${notification.amountUsd} USD)` : ""}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">From: {notification.sender || "System"}</div>
                        <div className="text-xs text-gray-400">{notification.date}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">No new notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">PWT Invest</div>
              <div className="text-xl font-bold">{loading ? "..." : pwtInvestBalance}</div>
            </div>

            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">PWT Cashout</div>
              <div className="text-xl font-bold">{loading ? "..." : pwtCashoutBalance}</div>
            </div>

            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">Activation Token</div>
              <div className="text-xl font-bold">
                {loading ? "..." : aftBalance} <span className="text-xs">USD</span>
              </div>
            </div>
          </div>

          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => setShowAFTModal(true)}
          >
            <div className="font-medium text-sm">Top Up</div>
            <div className="text-xs">Activation Token (AFT)</div>
          </button>
        </div>
      </header>

      {/* AFT Purchase Modal */}
      <AFTPurchaseModal isOpen={showAFTModal} onClose={() => setShowAFTModal(false)} />
    </div>
  )
}
