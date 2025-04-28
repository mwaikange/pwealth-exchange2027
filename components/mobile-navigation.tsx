"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Clock, DollarSign, BarChart3, Settings, LogOut } from "lucide-react"

export function MobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    // Import supabase dynamically to avoid SSR issues
    const { supabase } = await import("@/lib/supabase-singleton")
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Vesting",
      href: "/dashboard/vesting",
      icon: Clock,
    },
    {
      name: "Cashout",
      href: "/dashboard/cashout",
      icon: DollarSign,
    },
    {
      name: "Transactions",
      href: "/dashboard/transactions",
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-[#1e2130] border-t border-gray-800 flex justify-around items-center h-16 z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? "text-yellow-400" : "text-gray-400"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-1">{item.name}</span>
            </button>
          )
        })}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] mt-1">Logout</span>
        </button>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2a2d3a] rounded-lg p-5 w-full max-w-xs">
            <h3 className="text-lg font-medium mb-3">Confirm Logout</h3>
            <p className="text-sm text-gray-300 mb-4">Are you sure you want to log out?</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
