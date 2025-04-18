"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { WalletProvider } from "@/contexts/wallet-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { VestingProvider } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"
import { supabase } from "@/lib/supabaseClient"
import { logoutUser } from "@/actions/auth-actions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen] = useState(true) // Always keep sidebar open
  const [showPurchaseToast, setShowPurchaseToast] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  // Check if user is authenticated with proper delay
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      console.log("[CLIENT] DashboardLayout: Checking session...")

      try {
        // Wait a moment to allow Supabase to initialize
        await new Promise((resolve) => setTimeout(resolve, 500))

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (!session) {
          console.log("[CLIENT] DashboardLayout: No active session found, redirecting...")
          router.replace("/login")
        } else {
          console.log("[CLIENT] DashboardLayout: Session active")
          setAuthChecked(true)
          setLoading(false)
        }
      } catch (error) {
        console.error("Error checking session:", error)
        if (isMounted) {
          router.replace("/login")
        }
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[CLIENT] Auth state changed:", event)

      if (!session && event !== "INITIAL_SESSION") {
        console.log("[CLIENT] DashboardLayout: Signed out via auth state change")
        router.replace("/login")
      } else if (session) {
        console.log("[CLIENT] DashboardLayout: Auth state confirmed, session active")
        setAuthChecked(true)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [router])

  // Fetch user data only after authentication is confirmed
  useEffect(() => {
    async function fetchUserData() {
      if (!authChecked) return

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log("No user found after auth check")
          return
        }

        // Fetch user data from database
        const { data, error } = await supabase.from("app_users").select("*").eq("user_uuid", user.id).maybeSingle()

        if (error) {
          console.error("Error fetching user data:", error)
          return
        }

        setUserData(data || { email: user.email })
      } catch (error) {
        console.error("Error in fetchUserData:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [authChecked])

  // Add this component inside the DashboardLayout function, before the return statement
  function NotificationsButton() {
    const [showNotifications, setShowNotifications] = useState(false)
    const { transactions } = useTransactions()
    const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([])

    // Filter transactions to only show IN-PWT RECEIPT and IN-AFT GIFT
    // and exclude dismissed notifications
    const filteredNotifications = transactions.filter(
      (tx) => (tx.type === "IN-PWT RECEIPT" || tx.type === "IN-AFT GIFT") && !dismissedNotifications.includes(tx.id),
    )

    // Function to dismiss a notification
    const dismissNotification = (id: string) => {
      // Add this notification ID to the dismissed list
      setDismissedNotifications((prev) => [...prev, id])
    }

    return (
      <div className="relative" style={{ marginRight: "1.5%" }}>
        <button
          className="relative p-1.5 rounded-full bg-[#2a2d3a] border border-gray-700"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-5 w-5" />
          {filteredNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs">
              {filteredNotifications.length}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 bg-[#2a2d3a] border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium text-sm">Notifications</h3>
              <button
                className="text-gray-400 hover:text-white text-xs"
                onClick={() => {
                  // Mark all notifications as dismissed
                  const allIds = filteredNotifications.map((notification) => notification.id)
                  setDismissedNotifications((prev) => [...prev, ...allIds])
                }}
              >
                Close All
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification, index) => (
                  <div key={index} className="p-3 border-b border-gray-700 hover:bg-[#3a3d4a]">
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {notification.type === "IN-PWT RECEIPT" ? "PWT Received" : "AFT Gift Received"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {notification.type === "IN-PWT RECEIPT"
                            ? `You received ${notification.amount} PWT (${notification.amountUsd} USD)`
                            : `You received ${notification.amount} AFT (${notification.amountUsd} USD)`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          From: {notification.sender || "anonymous@example.com"}
                        </p>
                        <p className="text-xs text-gray-400">{notification.date}</p>
                      </div>
                      <button
                        className="text-gray-400 hover:text-white"
                        onClick={() => dismissNotification(notification.id)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">No new notifications</div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const pathname = usePathname()

  // Extract the current page title from the pathname
  const getPageTitle = () => {
    const path = pathname.split("/").pop()
    if (!path || path === "dashboard") return "OVERVIEW"
    return path.toUpperCase()
  }

  const handleSignOut = async () => {
    await logoutUser()
  }

  // Show loading state while checking auth and fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1c1e26] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <WalletProvider>
      <TransactionProvider>
        <VestingProvider>
          {/* Rest of your component remains the same */}
          <div className="flex flex-col h-screen max-h-[960px] bg-[#1c1e26] text-white overflow-hidden">
            {/* Your existing UI code */}
            {children}
          </div>
        </VestingProvider>
      </TransactionProvider>
    </WalletProvider>
  )
}
