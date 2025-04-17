"use client"

import { useState } from "react"

export default function Transactions() {
  const [transactionType, setTransactionType] = useState("")
  const [activeTab, setActiveTab] = useState("All")

  // Transaction templates
  const transactionTemplates = [
    { desc: "VESTING - LEVEL 1C", account: "PWT Invest", amount: "80 PWT", usd: "800 USD", type: "Outflow" },
    { desc: "VESTING - LEVEL 1D", account: "PWT Invest", amount: "80 PWT", usd: "800 USD", type: "Outflow" },
    { desc: "CLAIM - LEVEL 2B", account: "PWT Cashout", amount: "10 PWT", usd: "100 USD", type: "Earning" },
    { desc: "OUT-TRANSFER", account: "PWT Cashout", amount: "80 PWT", usd: "800 USD", type: "Outflow" },
    { desc: "OUT-AFT GIFT", account: "AFT Wallet", amount: "80 PWT", usd: "800 USD", type: "Outflow" },
    { desc: "IN-PWT RECEIPT", account: "PWT Invest", amount: "80 PWT", usd: "800 USD", type: "Earning" },
    { desc: "REFERRAL CLAIM", account: "PWT Cashout", amount: "80 PWT", usd: "800 USD", type: "Earning" },
    { desc: "BUY-AFT RECIEPT", account: "AFT Wallet", amount: "80 PWT", usd: "800 USD", type: "Earning" },
    { desc: "ACTIVATE FEE -LEVEL 2B", account: "AFT Wallet", amount: "4 PWT", usd: "40 USD", type: "Outflow" },
    { desc: "IN-AFT GIFT", account: "AFT Wallet", amount: "8 PWT", usd: "80 USD", type: "Earning" },
    { desc: "VESTING - LEVEL 3C", account: "PWT Invest", amount: "80 PWT", usd: "800 USD", type: "Outflow" },
    { desc: "VESTING - LEVEL 2D", account: "PWT Invest", amount: "80 PWT", usd: "800 USD", type: "Outflow" },
  ]

  // Generate transactions
  const transactions = Array.from({ length: 50 }).map((_, index) => {
    const template = transactionTemplates[index % transactionTemplates.length]
    return {
      ...template,
      date: "12 May, 5:40pm",
      reference: `TRX-${87686 + index}`,
    }
  })

  // Filter transactions based on selected type and active tab
  const filteredTransactions = transactions.filter((item) => {
    // Filter by transaction type dropdown
    if (transactionType && !item.desc.startsWith(transactionType)) {
      return false
    }

    // Filter by tab (All, Earnings, Outflows)
    if (activeTab === "Earnings" && item.type !== "Earning") {
      return false
    }
    if (activeTab === "Outflows" && item.type !== "Outflow") {
      return false
    }

    return true
  })

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
          {/* Filter Section */}
          <div className="flex justify-between items-center py-3 px-4">
            {/* Transaction Type Dropdown */}
            <div className="relative">
              <select
                className="bg-[#1c1e26] text-white px-4 py-1.5 text-xs rounded-md border border-gray-700 appearance-none pr-8 cursor-pointer"
                onChange={(e) => setTransactionType(e.target.value)}
                value={transactionType}
              >
                <option value="">Filter by Transaction Type</option>
                <option value="VESTING">Vesting</option>
                <option value="CLAIM">Claim</option>
                <option value="OUT-TRANSFER">Out Transfer</option>
                <option value="OUT-AFT">Out AFT Gift</option>
                <option value="IN-PWT">In PWT Receipt</option>
                <option value="REFERRAL">Referral Claim</option>
                <option value="BUY-AFT">Buy AFT Receipt</option>
                <option value="ACTIVATE">Activate Fee</option>
                <option value="IN-AFT">In AFT Gift</option>
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                className={`px-6 py-1.5 text-xs font-medium ${activeTab === "All" ? "bg-white text-black" : "bg-[#1c1e26] text-white"}`}
                onClick={() => setActiveTab("All")}
              >
                All
              </button>
              <button
                className={`px-6 py-1.5 text-xs font-medium ${activeTab === "Earnings" ? "bg-white text-black" : "bg-[#1c1e26] text-white"}`}
                onClick={() => setActiveTab("Earnings")}
              >
                Earnings
              </button>
              <button
                className={`px-6 py-1.5 text-xs font-medium ${activeTab === "Outflows" ? "bg-white text-black" : "bg-[#1c1e26] text-white"}`}
                onClick={() => setActiveTab("Outflows")}
              >
                Outflows
              </button>
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
                  {filteredTransactions.map((item, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="py-[6px] px-4 text-[10px] w-[22%]">
                        <span className={item.type === "Earning" ? "text-green-400" : "text-red-400"}>
                          {item.type === "Earning" ? "+" : "-"}
                        </span>{" "}
                        {item.desc}
                      </td>
                      <td className="py-[6px] px-4 text-[10px] w-[15%]">{item.account}</td>
                      <td className="py-[6px] px-4 text-[10px] w-[15%]">{item.date}</td>
                      <td className="py-[6px] px-4 text-[10px] w-[15%]">{item.reference}</td>
                      <td className="py-[6px] px-4 text-[10px] w-[15%]">{item.amount}</td>
                      <td className="py-[6px] px-4 text-[10px] w-[18%]">{item.usd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
