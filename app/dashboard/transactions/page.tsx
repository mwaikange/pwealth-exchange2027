"use client"

export default function Transactions() {
  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-gray-400 text-sm">Overview of all transactions</p>
      </div>

      {/* Transactions Table */}
      <div className="px-6 mt-2">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          {/* Filter Tabs */}
          <div className="flex justify-center py-3">
            <div className="inline-flex rounded-md overflow-hidden">
              <button className="bg-white text-black px-6 py-1.5 text-xs font-medium">All</button>
              <button className="bg-[#1c1e26] text-white px-6 py-1.5 text-xs font-medium">Earnings</button>
              <button className="bg-[#1c1e26] text-white px-6 py-1.5 text-xs font-medium">OutFlows</button>
            </div>
          </div>

          {/* Table with fixed header and scrollable body */}
          <div className="relative">
            {/* Fixed Header */}
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-700 bg-[#1c1e26]">
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[22%]">Description</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Account</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Date</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Reference</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[15%]">Amount (PWT)</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium w-[18%]">Amount (USD)</th>
                </tr>
              </thead>
            </table>

            {/* Scrollable Body */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <table className="w-full table-fixed">
                <tbody>
                  {Array.from({ length: 50 }).map((_, index) => {
                    // Determine which template to use based on index
                    const templates = [
                      { desc: "VESTING - LEVEL 1C", account: "PWT Invest", amount: "80 PWT", usd: "800 USD" },
                      { desc: "VESTING - LEVEL 1D", account: "PWT Invest", amount: "80 PWT", usd: "800 USD" },
                      { desc: "CLAIM - LEVEL 2B", account: "PWT Cashout", amount: "10 PWT", usd: "100 USD" },
                      { desc: "OUT-TRANSFER", account: "PWT Cashout", amount: "80 PWT", usd: "800 USD" },
                      { desc: "OUT-AFT GIFT", account: "AFT Wallet", amount: "80 PWT", usd: "800 USD" },
                      { desc: "IN-PWT RECEIPT", account: "PWT Invest", amount: "80 PWT", usd: "800 USD" },
                      { desc: "REFERRAL CLAIM", account: "PWT Cashout", amount: "80 PWT", usd: "800 USD" },
                      { desc: "BUY-AFT RECIEPT", account: "AFT Wallet", amount: "80 PWT", usd: "800 USD" },
                      { desc: "ACTIVATE FEE -LEVEL 2B", account: "AFT Wallet", amount: "4 PWT", usd: "40 USD" },
                      { desc: "IN-AFT GIFT", account: "AFT Wallet", amount: "8 PWT", usd: "80 USD" },
                      { desc: "VESTING - LEVEL 3C", account: "PWT Invest", amount: "80 PWT", usd: "800 USD" },
                      { desc: "VESTING - LEVEL 2D", account: "PWT Invest", amount: "80 PWT", usd: "800 USD" },
                    ]
                    const item = templates[index % templates.length]

                    return (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-[6px] px-4 text-[10px] w-[22%]">{item.desc}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">{item.account}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">12 May, 5:40pm</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">TRX-87686</td>
                        <td className="py-[6px] px-4 text-[10px] w-[15%]">{item.amount}</td>
                        <td className="py-[6px] px-4 text-[10px] w-[18%]">{item.usd}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
