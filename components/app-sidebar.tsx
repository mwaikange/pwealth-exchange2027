"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Clock, BarChart3, Users, Settings, HelpCircle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface AppSidebarProps {
  open: boolean
}

export function AppSidebar({ open }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

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
      description: "Lock shares for 5 days",
    },
    {
      name: "Exchange",
      href: "/dashboard/exchange",
      icon: BarChart3,
      description: "Buy & Sell Shares",
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-[96px] h-[calc(100vh-96px)] w-[200px] bg-[#2a2d3a] transition-transform duration-300 z-10",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 text-xl font-bold">PEER WEALTH TOKEN</div>
        <nav className="flex-1">
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
                    <div className="w-6 h-6 mr-3 flex items-center justify-center">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs">{item.description}</div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold mr-3">
              M
            </div>
            <div>
              <div className="text-sm font-medium">user :</div>
              <div className="text-xs text-gray-400">mwaikange@gmail.com</div>
            </div>
          </div>

          <div className="space-y-2">
            <button className="w-full flex items-center px-4 py-2 bg-white text-black rounded-md">
              <HelpCircle className="mr-3 h-5 w-5" />
              Help & Support
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 bg-red-500 text-white rounded-md"
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
