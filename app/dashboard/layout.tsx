"use client"

import type React from "react"

import { useState } from "react"
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen] = useState(true) // Always keep sidebar open
  const pathname = usePathname()
  const router = useRouter()

  // Extract the current page title from the pathname
  const getPageTitle = () => {
    const path = pathname.split("/").pop()
    if (!path || path === "dashboard") return "OVERVIEW"
    return path.toUpperCase()
  }

  const handleSignOut = () => {
    router.push("/login")
  }

  return (
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
          <div className="relative" style={{ marginRight: "1.5%" }}>
            <button className="relative p-1.5 rounded-full bg-[#2a2d3a] border border-gray-700">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs">
                3
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* PWT Invest Box */}
            <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
              <div className="flex items-center text-[10px] text-gray-300">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 6H21M5 6V20H19V6M8 6V4H16V6M10 10H14M10 14H14M10 18H14"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                PWT Invest
              </div>
              <div className="text-xl font-bold">30</div>
            </div>

            {/* PWT Cashout Box */}
            <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
              <div className="flex items-center text-[10px] text-gray-300">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 6H21M5 6V20H19V6M8 6V4H16V6M10 10H14M10 14H14M10 18H14"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                PWT Cashout
              </div>
              <div className="text-xl font-bold">30</div>
            </div>

            {/* Activation Token Box */}
            <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
              <div className="flex items-center text-[10px] text-gray-300">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 6H21M5 6V20H19V6M8 6V4H16V6M10 10H14M10 14H14M10 18H14"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Activation Token
              </div>
              <div className="text-xl font-bold flex items-center">
                30 <span className="text-[10px] ml-1">USD</span>
              </div>
            </div>

            {/* Top Up Button */}
            <button
              className="bg-[#34a853] text-white rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-green-600 px-6"
              style={{
                height: "70%",
                minWidth: "160px",
                padding: "6px 12px",
              }}
              onClick={() => alert("Top Up clicked")}
            >
              <div className="text-base font-bold">Top Up</div>
              <div className="text-xs">Activation Token (AFT)</div>
            </button>
          </div>
        </div>
      </header>

      {/* Alert Bar */}
      <div className="bg-green-600 py-1 px-4 text-white whitespace-nowrap overflow-hidden text-sm">
        <div className="animate-marquee">
          Join Our Telegram Group Today | Add Our Whatsapp Channel - Check Your Settings Page | Registration Alert -
          Namibia- Welcome! | Cashout Alert - Namibia - 50 USD - Well Done!
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
                M
              </div>
              <div>
                <div className="text-xs font-medium">user :</div>
                <div className="text-xs text-gray-400">mwaikange@gmail.com</div>
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
  )
}
