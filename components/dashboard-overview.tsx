"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
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
import Link from "next/link"

export function DashboardOverview() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-[#1c1e26] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="h-[100px] bg-[#2a2d3a] border-b border-gray-700 flex items-center px-4">
        <div className="flex items-center">
          <div className="w-[90px] h-[90px] relative mr-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#b8a432]"></div>
            <div className="absolute inset-[6px] rounded-full bg-[#1c1e26] flex items-center justify-center">
              <div className="w-[60px] h-[60px] rounded-full border-t-2 border-[#4285f4] flex items-center justify-center">
                <div className="w-[40px] h-[40px] rounded-full border-t-2 border-[#34a853]"></div>
              </div>
            </div>
          </div>

          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4 text-white hover:text-gray-300">
            <ChevronLeft className="h-6 w-6" />
          </button>

          <h1 className="text-4xl font-bold">OVERVIEW</h1>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <div className="relative">
            <button className="relative p-2 rounded-full bg-[#2a2d3a] border border-gray-700">
              <Bell className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-xs">
                3
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-[#4a4d5a] rounded-md p-3 flex flex-col items-center">
              <div className="text-xs text-gray-400">PWT Invest</div>
              <div className="text-3xl font-bold">30</div>
            </div>
            <div className="bg-[#4a4d5a] rounded-md p-3 flex flex-col items-center">
              <div className="text-xs text-gray-400">PWT Cashout</div>
              <div className="text-3xl font-bold">30</div>
            </div>
            <div className="bg-[#4a4d5a] rounded-md p-3 flex flex-col items-center">
              <div className="text-xs text-gray-400">Activation Token (AFT)</div>
              <div className="text-3xl font-bold">
                30 <span className="text-xs">USD</span>
              </div>
            </div>
          </div>

          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">
            <div className="font-bold">Top Up</div>
            <div className="text-xs">Activation Token (AFT)</div>
          </button>
        </div>
      </header>

      {/* Alert Bar */}
      <div className="bg-green-600 py-2 px-4 text-white whitespace-nowrap overflow-hidden">
        <div className="animate-marquee">
          Join Our Telegram Group Today | Add Our Whatsapp Channel - Check Your Settings Page | Registration Alert -
          Namibia- Welcome! | Cashout Alert - Namibia - 50 USD - Well Done!
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-[220px] bg-[#2a2d3a] transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}
        >
          <div className="flex-1">
            <div className="p-4 text-xl font-bold">PEER WEALTH TOKEN</div>
            <nav className="mt-4">
              <Link href="/dashboard" className="flex items-center px-4 py-3 bg-[#fff27a] text-black">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Overview</div>
                  <div className="text-xs">Dashboard Overview</div>
                </div>
              </Link>
              <Link href="/dashboard/vesting" className="flex items-center px-4 py-3 text-gray-300 hover:bg-[#3a3d4a]">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Vesting</div>
                  <div className="text-xs">Investment Schedules</div>
                </div>
              </Link>
              <Link href="/dashboard/cashout" className="flex items-center px-4 py-3 text-gray-300 hover:bg-[#3a3d4a]">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Cashout</div>
                  <div className="text-xs">Transfer, Sell & Swap Tokens</div>
                </div>
              </Link>
              <Link
                href="/dashboard/transactions"
                className="flex items-center px-4 py-3 text-gray-300 hover:bg-[#3a3d4a]"
              >
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Transactions</div>
                  <div className="text-xs">Transactions History</div>
                </div>
              </Link>
              <Link
                href="/dashboard/referrals"
                className="flex items-center px-4 py-3 text-gray-300 hover:bg-[#3a3d4a]"
              >
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Referrals</div>
                  <div className="text-xs">Claim referral rewards</div>
                </div>
              </Link>
              <Link href="/dashboard/settings" className="flex items-center px-4 py-3 text-gray-300 hover:bg-[#3a3d4a]">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Settings</div>
                  <div className="text-xs">Change password</div>
                </div>
              </Link>
            </nav>
          </div>

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

              <button className="w-full flex items-center px-4 py-2 bg-red-500 text-white rounded-md">
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? "ml-[220px]" : "ml-0"}`}>
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="bg-green-600 p-4 rounded-lg">
                <div className="text-sm">Total Cashouts to date</div>
                <div className="text-5xl font-bold">2450</div>
                <div className="text-sm">NAD</div>
              </div>

              <div className="bg-blue-600 p-4 rounded-lg">
                <div className="text-sm">Total Shares Matched</div>
                <div className="text-5xl font-bold">245</div>
                <div className="text-sm">shares</div>
              </div>

              <div className="bg-yellow-600 p-4 rounded-lg">
                <div className="text-sm">Referral Bonus</div>
                <div className="text-5xl font-bold">12</div>
                <div className="text-sm">shares</div>
              </div>

              <div className="bg-purple-600 p-4 rounded-lg">
                <div className="text-sm">Total Unvested Shares</div>
                <div className="text-5xl font-bold">875</div>
                <div className="text-sm">shares</div>
              </div>

              <div className="bg-gray-600 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-lg">Current Price</div>
                <div className="text-3xl font-bold">1 PWT</div>
                <div className="text-xl">=</div>
                <div className="text-3xl font-bold">100 NAD</div>
              </div>
            </div>

            {/* Most Active Vesting Slots */}
            <div className="bg-[#2a2d3a] rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Most Active Vesting Slots</h2>
                <button className="text-gray-400">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="mr-4 w-20">Slot A</div>
                  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold mr-4">
                    25
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: "90%" }}></div>
                  </div>
                  <div className="ml-4 font-bold">90%</div>
                </div>

                <div className="flex items-center">
                  <div className="mr-4 w-20">Slot B</div>
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mr-4">
                    100
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
                    <div className="bg-blue-500 h-4 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                  <div className="ml-4 font-bold">75%</div>
                </div>

                <div className="flex items-center">
                  <div className="mr-4 w-20">Slot C</div>
                  <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold mr-4">
                    750
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
                    <div className="bg-purple-500 h-4 rounded-full" style={{ width: "65%" }}></div>
                  </div>
                  <div className="ml-4 font-bold">65%</div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#2a2d3a] rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Recent Transactions</h2>
                <button className="text-gray-400">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-left py-3 px-4">Account</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Reference</th>
                      <th className="text-left py-3 px-4">Amount (PWT)</th>
                      <th className="text-left py-3 px-4">Amount (NAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td className="py-3 px-4">VESTING - Slot A</td>
                      <td className="py-3 px-4">Hold Wallet</td>
                      <td className="py-3 px-4">20 Jan, 2:30pm</td>
                      <td className="py-3 px-4">TRX-87690</td>
                      <td className="py-3 px-4">5 PWT</td>
                      <td className="py-3 px-4">500 NAD</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                      <td className="py-3 px-4">CLAIM - Slot B</td>
                      <td className="py-3 px-4">Hold Wallet</td>
                      <td className="py-3 px-4">20 Jan, 11:15am</td>
                      <td className="py-3 px-4">TRX-87689</td>
                      <td className="py-3 px-4">3 PWT</td>
                      <td className="py-3 px-4">300 NAD</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">CASHOUT - Mobile Money</td>
                      <td className="py-3 px-4">Cashout Wallet</td>
                      <td className="py-3 px-4">19 Jan, 4:45pm</td>
                      <td className="py-3 px-4">TRX-87688</td>
                      <td className="py-3 px-4">10 PWT</td>
                      <td className="py-3 px-4">1000 NAD</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
