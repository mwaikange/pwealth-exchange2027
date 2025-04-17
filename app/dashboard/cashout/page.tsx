"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

export default function Cashout() {
  const [emailTransfer, setEmailTransfer] = useState("")
  const [pwtTokens, setPwtTokens] = useState("")
  const [usdValueTransfer, setUsdValueTransfer] = useState("")
  const [emailGift, setEmailGift] = useState("")
  const [usdValueGift, setUsdValueGift] = useState("")

  const handleTransfer = () => {
    // Handle transfer logic
    console.log("Transfer initiated")
  }

  const handleGift = () => {
    // Handle gift logic
    console.log("Gift initiated")
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Cashout</h1>
        <p className="text-gray-400 text-sm">Cashout by selling tokens & transferring them other users.</p>
      </div>

      {/* Main Content */}
      <div className="px-6 space-y-3">
        {/* Two Cards Side by Side */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Card - Transfer PWT/FIAT */}
          <div className="bg-[#2a2d3a] rounded-lg p-4">
            <h2 className="text-xl font-bold text-yellow-300 mb-1">TRANSFER - ( PWT / FIAT)</h2>
            <p className="text-green-500 text-xs mb-2">These transactions are irreversible please read T&C's</p>

            <p className="text-xs mb-2">
              Sell tokens in your local currency to friends, family, referrals and your social audience.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={emailTransfer}
                onChange={(e) => setEmailTransfer(e.target.value)}
                placeholder="enter the email of receiving party"
                className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={pwtTokens}
                  onChange={(e) => setPwtTokens(e.target.value)}
                  placeholder="#Pwt Tokens"
                  className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
                />
                <input
                  type="text"
                  value={usdValueTransfer}
                  onChange={(e) => setUsdValueTransfer(e.target.value)}
                  placeholder="USD Value"
                  className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleTransfer}
                  className="bg-[#34a853] hover:bg-green-600 text-white font-medium py-1 px-6 rounded text-sm"
                >
                  TRANSFER
                </button>
              </div>
            </div>
          </div>

          {/* Right Card - Gift Activation Fee Tokens */}
          <div className="bg-[#2a2d3a] rounded-lg p-4">
            <h2 className="text-xl font-bold text-yellow-300 mb-1">GIFT ACTIVATION FEE TOKENS</h2>
            <p className="text-green-500 text-xs mb-2">These transactions are irreversible please read T&C's</p>

            <p className="text-xs mb-2">Sell or Gift Fee Tokens to your referrals or any member in your community.</p>

            <div className="space-y-2">
              <input
                type="text"
                value={emailGift}
                onChange={(e) => setEmailGift(e.target.value)}
                placeholder="enter the email of the recieving party"
                className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
              />

              <input
                type="text"
                value={usdValueGift}
                onChange={(e) => setUsdValueGift(e.target.value)}
                placeholder="USD Value"
                className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
              />

              <div className="flex justify-end mt-[34px]">
                <button
                  onClick={handleGift}
                  className="bg-[#34a853] hover:bg-green-600 text-white font-medium py-1 px-6 rounded text-sm"
                >
                  TRANSFER
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2">
            <h3 className="text-xs font-medium">Recent Cashout Transactions</h3>
            <Link href="/dashboard/transactions">
              <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white cursor-pointer" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 bg-[#1c1e26]">
                  <th className="text-left py-1 px-4 font-medium">Transaction</th>
                  <th className="text-left py-1 px-4 font-medium">Account</th>
                  <th className="text-left py-1 px-4 font-medium">Date</th>
                  <th className="text-left py-1 px-4 font-medium">Amount (PWT)</th>
                  <th className="text-left py-1 px-4 font-medium">Recipient</th>
                  <th className="text-left py-1 px-4 font-medium">Reference</th>
                  <th className="text-left py-1 px-4 font-medium">Amount (USD)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    type: "OUT-TRANSFER",
                    account: "PWT Cashout",
                    date: "12 May, 5:40pm",
                    amount: "80 PWT",
                    email: "mwaikange@gmail.com",
                    ref: "TRX-8656",
                    usd: "800 USD",
                  },
                  {
                    type: "OUT-AFT GIFT",
                    account: "AFT Wallet",
                    date: "11 May, 3:22pm",
                    amount: "40 PWT",
                    email: "john@example.com",
                    ref: "TRX-8655",
                    usd: "400 USD",
                  },
                  {
                    type: "OUT-TRANSFER",
                    account: "PWT Cashout",
                    date: "10 May, 1:15pm",
                    amount: "60 PWT",
                    email: "sarah@example.com",
                    ref: "TRX-8654",
                    usd: "600 USD",
                  },
                  {
                    type: "OUT-AFT GIFT",
                    account: "AFT Wallet",
                    date: "09 May, 11:30am",
                    amount: "20 PWT",
                    email: "david@example.com",
                    ref: "TRX-8653",
                    usd: "200 USD",
                  },
                  {
                    type: "OUT-TRANSFER",
                    account: "PWT Cashout",
                    date: "08 May, 9:45am",
                    amount: "100 PWT",
                    email: "emma@example.com",
                    ref: "TRX-8652",
                    usd: "1000 USD",
                  },
                ].map((item, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-1 px-4 text-[10px]">{item.type}</td>
                    <td className="py-1 px-4 text-[10px]">{item.account}</td>
                    <td className="py-1 px-4 text-[10px]">{item.date}</td>
                    <td className="py-1 px-4 text-[10px]">{item.amount}</td>
                    <td className="py-1 px-4 text-[10px]">{item.email}</td>
                    <td className="py-1 px-4 text-[10px]">{item.ref}</td>
                    <td className="py-1 px-4 text-[10px]">{item.usd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
