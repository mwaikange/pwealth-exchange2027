"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Clock, DollarSign, BarChart3, Users, Settings, HelpCircle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  open: boolean
}

export function AppSidebar({ open }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Dashboard Overview",
    },
    {
      name: "Vesting",
      href: "/dashboard/vesting",
      icon: Clock,
      description: "Investment Schedules",
    },
    {
      name: "Cashout",
      href: "/dashboard/cashout",
      icon: DollarSign,
      description: "Transfer, Sell & Swap Tokens",
    },
    {
      name: "Transactions",
      href: "/dashboard/transactions",
      icon: BarChart3,
      description: "Transactions History",
    },
    {
      name: "Referrals",
      href: "/dashboard/referrals",
      icon: Users,
      description: "Claim referral rewards",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Change password",
    },
  ]

  const handleSignOut = () => {
    router.push("/login")
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-[64px] h-[calc(100vh-64px)] w-[200px] bg-[#2a2d3a] transition-all duration-300 z-10",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium",
                      isActive ? "bg-yellow-300 text-black" : "text-gray-300 hover:bg-[#3a3d4a]",
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs opacity-60">{item.description}</div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold mr-3">
              M
            </div>
            <div>
              <div className="text-sm font-medium">user :</div>
              <div className="text-xs text-gray-400">mwaikange@gmail.com</div>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href="#"
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#3a3d4a] rounded-md"
            >
              <HelpCircle className="mr-3 h-5 w-5" />
              Help & Support
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#3a3d4a] rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
