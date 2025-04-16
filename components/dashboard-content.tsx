import { ChevronRight } from "lucide-react"

export function DashboardContent() {
  return (
    <div className="p-3 h-full overflow-hidden bg-[#1c1e26]" style={{ marginTop: "-1%" }}>
      <h1 className="text-2xl font-bold mb-3" style={{ marginTop: "1%" }}>
        Dashboard Overview
      </h1>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-5 gap-3 mb-4"
        style={{ transform: "scale(0.9)", transformOrigin: "top left", margin: "0 auto", width: "111.11%" }}
      >
        <div className="bg-green-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Total Cashout to date</div>
          <div className="text-3xl font-bold">300.00</div>
          <div className="text-xs">USD</div>
        </div>

        <div className="bg-blue-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Total Cashout to date</div>
          <div className="text-3xl font-bold">30</div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-yellow-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Total Referral Claims</div>
          <div className="text-3xl font-bold">6</div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-purple-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Current Expected Yield</div>
          <div className="text-3xl font-bold">45</div>
          <div className="text-xs">tokens</div>
        </div>

        <div
          className="bg-gray-600 rounded-lg flex flex-col items-center justify-center"
          style={{ padding: "0.55rem" }}
        >
          <div className="text-sm">Rate</div>
          <div className="text-xl font-bold">1 PWT</div>
          <div className="text-sm">=</div>
          <div className="text-xl font-bold">10 USD</div>
        </div>
      </div>

      {/* Vesting Schedules */}
      <div
        className="bg-[#2a2d3a] rounded-lg p-3 mb-4"
        style={{
          transform: "scale(0.9)",
          transformOrigin: "top left",
          margin: "5px auto 0",
          width: "111.11%",
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium">Top 3 Active vesting Schedules per Level</h2>
          <button className="text-gray-400">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <div className="mr-3 w-12 text-sm">Level 1</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-sm">
              2
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: "78%" }}></div>
            </div>
            <div className="ml-3 font-bold text-sm">78%</div>
          </div>

          <div className="flex items-center">
            <div className="mr-3 w-12 text-sm">Level 2</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-sm">
              4
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: "23%" }}></div>
            </div>
            <div className="ml-3 font-bold text-sm">23%</div>
          </div>

          <div className="flex items-center">
            <div className="mr-3 w-12 text-sm">Level 3</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-sm">
              8
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: "65%" }}></div>
            </div>
            <div className="ml-3 font-bold text-sm">65%</div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        className="bg-[#2a2d3a] rounded-lg p-3"
        style={{
          transform: "scale(0.9)",
          transformOrigin: "top left",
          margin: "-2px auto 0", // Reduced from 5px to -2px to move upward by another 1.5%
          width: "111.11%",
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-medium">Recent Transactions</h2>
          <button className="text-gray-400">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-left py-2 px-3">Account</th>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Reference</th>
                <th className="text-left py-2 px-3">Amount (PWT)</th>
                <th className="text-left py-2 px-3">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700">
                <td className="py-2 px-3">VESTING - LEVEL 1C</td>
                <td className="py-2 px-3">PWT Invest</td>
                <td className="py-2 px-3">12 May, 5:40pm</td>
                <td className="py-2 px-3">TRX-87686</td>
                <td className="py-2 px-3">80 PWT</td>
                <td className="py-2 px-3">800 USD</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="py-2 px-3">VESTING - LEVEL 1D</td>
                <td className="py-2 px-3">PWT Invest</td>
                <td className="py-2 px-3">12 May, 5:40pm</td>
                <td className="py-2 px-3">TRX-87686</td>
                <td className="py-2 px-3">80 PWT</td>
                <td className="py-2 px-3">800 USD</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="py-2 px-3">CLAIM - LEVEL 2B</td>
                <td className="py-2 px-3">PWT Cashout</td>
                <td className="py-2 px-3">12 May, 5:40pm</td>
                <td className="py-2 px-3">TRX-87686</td>
                <td className="py-2 px-3">10 PWT</td>
                <td className="py-2 px-3">100 USD</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
