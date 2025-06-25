"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Clock, BarChart3, Users, Settings, HelpCircle, LogOut, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { PeerGPTChat } from "./peer-gpt-chat"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Static data for testing - no Supabase calls
  const mockReferralCode = "DEMO-USER-001"

  const navItems = [
    {
      name: "Overview",
      description: "Dashboard Overview",
      href: "/dashboard/overview",
      icon: LayoutDashboard,
    },
    {
      name: "Exchange",
      description: "Buy & Sell Shares",
      href: "/dashboard/exchange",
      icon: TrendingUp,
    },
    {
      name: "Vesting",
      description: "Lock shares for 5 days",
      href: "/dashboard/vesting",
      icon: Clock,
    },
    {
      name: "Transactions",
      description: "Transactions History",
      href: "/dashboard/transactions",
      icon: BarChart3,
    },
    {
      name: "Referrals",
      description: "Claim referral rewards",
      href: "/dashboard/referrals",
      icon: Users,
    },
    {
      name: "Settings",
      description: "Change password",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      // Still try to redirect even if there's an error
      router.push("/login")
    }
  }

  return (
    <aside className="w-[200px] bg-[#1e2130] border-r border-gray-800 flex flex-col h-full">
      <div className="p-3 text-base font-bold">
        PEER WEALTH
        <br />
        TOKEN
      </div>

      <nav className="flex-1 py-1">
        <div className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded",
                  isActive ? "bg-yellow-400 text-black" : "text-gray-300 hover:bg-gray-800",
                )}
              >
                <div className="w-5 h-5 mr-2 flex items-center justify-center">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-xs">{item.name}</div>
                  <div className="text-[9px]">{item.description}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-2 border-t border-gray-800">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold mr-2">
            {user?.email ? user.email.charAt(0).toUpperCase() : "D"}
          </div>
          <div>
            <div className="text-[9px]">User: {mockReferralCode}</div>
            <div className="text-[8px] text-gray-400">{user?.email || "demo@example.com"}</div>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-full flex items-center px-2 py-1.5 bg-white text-black rounded text-xs"
          >
            <HelpCircle className="mr-1.5 h-3 w-3" />
            Help & Support
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-2 py-1.5 bg-red-500 text-white rounded text-xs"
          >
            <LogOut className="mr-1.5 h-3 w-3" />
            Sign Out
          </button>
        </div>
      </div>
      {isChatOpen && <PeerGPTChat onClose={() => setIsChatOpen(false)} />}
    </aside>
  )
}
