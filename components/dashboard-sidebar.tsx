"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Clock, DollarSign, BarChart3, Users, Settings, HelpCircle, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const navItems = [
    {
      title: "Overview",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      title: "Vesting",
      icon: Clock,
      href: "/dashboard/vesting",
      active: pathname === "/dashboard/vesting",
      description: "Investment Schedules",
    },
    {
      title: "Cashout",
      icon: DollarSign,
      href: "/dashboard/cashout",
      active: pathname === "/dashboard/cashout",
      description: "Transfer, Sell & Swap",
    },
    {
      title: "Transactions",
      icon: BarChart3,
      href: "/dashboard/transactions",
      active: pathname === "/dashboard/transactions",
      description: "Transactions History",
    },
    {
      title: "Referrals",
      icon: Users,
      href: "/dashboard/referrals",
      active: pathname === "/dashboard/referrals",
      description: "Claim referral rewards",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
      description: "Change password",
    },
  ]

  return (
    <div className="w-[220px] h-screen bg-[#1c1e26] border-r border-gray-800 flex flex-col">
      <div className="p-4 flex items-center">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold mr-3">
          PW
        </div>
        <div>
          <div className="font-bold uppercase">PEER WEALTH</div>
          <div className="text-xs text-gray-400">TOKEN</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-[11px] ${
                item.active ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <item.icon className="h-4 w-4 mr-3" />
              <div>
                <div>{item.title}</div>
                {item.description && <div className="text-[9px] text-gray-500">{item.description}</div>}
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="mb-4">
          <div className="text-xs text-gray-400">Logged in as:</div>
          <div className="text-sm truncate">{user?.email || "User"}</div>
        </div>

        <div className="space-y-2">
          <Link
            href="#"
            className="flex items-center px-3 py-2 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <HelpCircle className="h-4 w-4 mr-3" />
            Help & Support
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 rounded-md text-[11px] text-red-400 hover:text-white hover:bg-red-900"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
