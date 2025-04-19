"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Clock, DollarSign, BarChart3, Users, Settings, HelpCircle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      name: "Overview",
      description: "Dashboard Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Vesting",
      description: "Investment Schedules",
      href: "/dashboard/vesting",
      icon: Clock,
    },
    {
      name: "Cashout",
      description: "Transfer, Sell & Swap",
      href: "/dashboard/cashout",
      icon: DollarSign,
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

  const handleSignOut = () => {
    router.push("/login")
  }

  return (
    <aside className="w-[200px] bg-[#1e2130] border-r border-gray-800 flex flex-col">
      <div className="p-4 text-lg font-bold">
        PEER WEALTH
        <br />
        TOKEN
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3",
                isActive ? "bg-yellow-400 text-black" : "text-gray-300 hover:bg-gray-800",
              )}
            >
              <div className="w-6 h-6 mr-3 flex items-center justify-center">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold mr-3">
            M
          </div>
          <div>
            <div className="text-xs">user :</div>
            <div className="text-xs text-gray-400">mwaikange@gmail.com</div>
          </div>
        </div>

        <div className="space-y-2">
          <button className="w-full flex items-center px-3 py-2 bg-white text-black rounded text-sm">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 bg-red-500 text-white rounded text-sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
