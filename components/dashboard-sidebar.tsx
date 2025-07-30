"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3,
  TrendingUp,
  Clock,
  CreditCard,
  Users,
  Shield,
  HelpCircle,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const sidebarItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: BarChart3,
    description: "Dashboard Overview",
  },
  {
    title: "Exchange",
    href: "/dashboard/exchange",
    icon: TrendingUp,
    description: "Buy & Sell Shares",
  },
  {
    title: "Vesting",
    href: "/dashboard/vesting",
    icon: Clock,
    description: "Lock shares for 5 days",
  },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: CreditCard,
    description: "Transaction History",
  },
  {
    title: "Referrals",
    href: "/dashboard/referrals",
    icon: Users,
    description: "Claim referral rewards",
  },
  {
    title: "KYC",
    href: "/dashboard/kyc",
    icon: Shield,
    description: "Verification & Security",
  },
]

export function DashboardSidebar({ className, ...props }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen)

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-800 text-white hover:bg-slate-700"
        onClick={toggleMobile}
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 transform bg-slate-900 transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
        {...props}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-slate-800 px-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">PW</span>
              </div>
              <span className="text-xl font-bold text-white">PEER WEALTH</span>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <div className="space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-yellow-500 text-black" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div>{item.title}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </ScrollArea>

          <Separator className="bg-slate-800" />

          {/* User Section */}
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  User: {user?.email?.split("@")[0] || "DEMO-USER-001"}
                </div>
                <div className="text-xs text-slate-400">demo@gmail.com</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                asChild
              >
                <Link href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
