"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronLeft,
  Bell,
  LayoutDashboard,
  Clock,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react"
import Image from "next/image"
import { WalletProvider } from "@/contexts/wallet-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { WalletBalances } from "@/components/wallet-balances"
import { VestingProvider } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { logoutUser } from "@/actions/auth-actions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen] = useState(true) // Always keep sidebar open
  const [showPurchaseToast, setShowPurchaseToast] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Add this at the beginning of the DashboardLayout function
  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          console.log("No active session found, redirecting to login")
          router.push("/login")
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      }
    }

    checkAuth()
  }, [router])

  // Fetch user data from Supabase
  useEffect(() => {
    async function fetchUserData() {
      if (!user) return

      try {
        // Replace .single() with .maybeSingle() to handle the case where no row exists
        const { data, error } = await supabase.from("app_users").select("*").eq("user_uuid", user.id).maybeSingle()

        if (error) {
          console.error("Error fetching user data:", error)
          return
        }

        // If no user data exists, create it
        if (!data) {
          // Create a basic user profile
          const displayId = `USR-${Math.floor(1000000 + Math.random() * 9000000)}`
          const { error: createError } = await supabase.from("app_users").insert({
            user_uuid: user.id,
            email: user.email,
            display_id: displayId,
            created_at: new Date().toISOString(),
            status: "active",
          })

          if (createError) {
            console.error("Error creating user data:", createError)
          } else {
            // Fetch the newly created user data
            const { data: newData } = await supabase
              .from("app_users")
              .select("*")
              .eq("user_uuid", user.id)
              .maybeSingle()

            setUserData(newData)
          }
        } else {
          setUserData(data)
        }

        // Also fetch referral code
        const { data: settingsData } = await supabase
          .from("usersettings")
          .select("referral_code")
          .eq("user_uuid", user.id)
          .maybeSingle()

        // Add this to your existing data fetching:
        const { data: referralData } = await supabase
          .from("referrals")
          .select("referrer_email")
          .eq("user_uuid", user.id)
          .maybeSingle()

        // Then merge this with your user data:
        if (data) {
          const userData = {
            ...data,
            referrer_email: referralData?.referrer_email || null,
          }

          if (settingsData) {
            setUserData((prev) => ({ ...prev, referral_code: settingsData.referral_code, ...userData }))
          } else {
            setUserData(userData)
          }
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

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

  return (
    <WalletProvider>
      <TransactionProvider>
        <VestingProvider>
          <div className="flex flex-col h-screen max-h-[960px] bg-[#1c1e26] text-white overflow-hidden">
            {/* Top Bar */}
            <header className="h-[64px] bg-[#2a2d3a] border-b border-gray-700 flex items-center px-3 mb-2">
              <div className="flex items-center">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%203491%20%281%29%2013-2gOFF6M9ejRUc2QKf3i9uugVT7RCJ6.png"
                  alt="Peer Wealth Token"
                  width={50}
                  height={50}
                  className="rounded-full mr-3"
                />

                <button className="mr-3 text-white hover:text-gray-300">
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
              </div>

              <div className="ml-auto flex items-center space-x-3">
                <NotificationsButton />

                {/* Wallet Balances Component */}
                <WalletBalances />

                {/* Top Up Button */}
                <button
                  className="bg-[#34a853] text-white rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-green-600 px-6"
                  style={{
                    height: "70%",
                    minWidth: "160px",
                    padding: "6px 12px",
                  }}
                  onClick={() => setShowPurchaseToast(true)}
                >
                  <div className="text-base font-bold">Top Up</div>
                  <div className="text-xs">Activation Token (AFT)</div>
                </button>
              </div>
            </header>

            {/* Alert Bar */}
            <div className="bg-green-600 py-1 px-4 text-white whitespace-nowrap overflow-hidden text-sm">
              <div className="animate-marquee">
                Join Our Telegram Group Today | Add Our Whatsapp Channel - Check Your Settings Page | Registration Alert
                - Namibia- Welcome! | Cashout Alert - Namibia - 50 USD - Well Done!
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar - fixed width, always visible */}
              <aside className="w-[190px] min-w-[190px] bg-[#2a2d3a] flex flex-col">
                <div className="p-3 text-base font-bold">PEER WEALTH TOKEN</div>
                <nav className="flex-1">
                  <Link
                    href="/dashboard"
                    className={`flex items-center px-3 py-2 ${pathname === "/dashboard" ? "bg-[#fff27a] text-black" : "text-gray-300 hover:bg-[#3a3d4a]"}`}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Overview</div>
                      <div className="text-xs">Dashboard Overview</div>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/vesting"
                    className={`flex items-center px-3 py-2 ${pathname === "/dashboard/vesting" ? "bg-[#fff27a] text-black" : "text-gray-300 hover:bg-[#3a3d4a]"}`}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Vesting</div>
                      <div className="text-xs">Investment Schedules</div>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/cashout"
                    className={`flex items-center px-3 py-2 ${pathname === "/dashboard/cashout" ? "bg-[#fff27a] text-black" : "text-gray-300 hover:bg-[#3a3d4a]"}`}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Cashout</div>
                      <div className="text-xs">Transfer, Sell & Swap</div>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/transactions"
                    className={`flex items-center px-3 py-2 ${pathname === "/dashboard/transactions" ? "bg-[#fff27a] text-black" : "text-gray-300 hover:bg-[#3a3d4a]"}`}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Transactions</div>
                      <div className="text-xs">Transactions History</div>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/referrals"
                    className={`flex items-center px-3 py-2 ${pathname === "/dashboard/referrals" ? "bg-[#fff27a] text-black" : "text-gray-300 hover:bg-[#3a3d4a]"}`}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Referrals</div>
                      <div className="text-xs">Claim referral rewards</div>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className={`flex items-center px-3 py-2 ${pathname === "/dashboard/settings" ? "bg-[#fff27a] text-black" : "text-gray-300 hover:bg-[#3a3d4a]"}`}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Settings</div>
                      <div className="text-xs">Change password</div>
                    </div>
                  </Link>
                </nav>

                <div className="p-3 border-t border-gray-700">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-base font-bold mr-2">
                      {userData?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="text-xs font-medium">user :</div>
                      <div className="text-xs text-gray-400">{userData?.email || user?.email || "Loading..."}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Link href="#" className="block w-full">
                      <button className="w-full flex items-center px-3 py-1.5 bg-white text-black rounded-md text-xs">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Support
                      </button>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-3 py-1.5 bg-red-500 text-white rounded-md text-xs"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </aside>

              {/* Main Content - no margin between sidebar and content */}
              <main className="flex-1 overflow-hidden">{children}</main>
            </div>
          </div>
          {/* Purchase Toast */}
          {showPurchaseToast && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
              <div className="bg-[#2a2d3a] border border-gray-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Purchase Activation Tokens</h3>
                  <button onClick={() => setShowPurchaseToast(false)} className="text-gray-400 hover:text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <label htmlFor="amount" className="block text-gray-300 mb-2">
                    Enter amount to purchase (minimum $50):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      id="amount"
                      type="number"
                      min="50"
                      defaultValue="50"
                      className="w-full bg-[#1c1e26] text-white py-2 px-8 rounded-md"
                      placeholder="Enter amount"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum purchase amount is $50 USD</p>
                </div>

                <div className="mb-6">
                  <p className="text-gray-300 mb-2">Payment method:</p>
                  <button className="w-full bg-[#1c1e26] text-white py-3 rounded-md transition-colors flex items-center justify-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" />
                    </svg>
                    <span>Credit Card</span>
                  </button>
                </div>

                <button className="w-full bg-[#34a853] hover:bg-green-600 text-white py-3 rounded-md font-medium transition-colors">
                  Proceed to Payment
                </button>

                <p className="text-xs text-gray-400 mt-4 text-center">
                  By proceeding, you agree to our Terms and Conditions.
                </p>
              </div>
            </div>
          )}
        </VestingProvider>
      </TransactionProvider>
    </WalletProvider>
  )
}
