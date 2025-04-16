export function TransactionsHistory() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Transactions</h1>
        <p className="text-gray-400">Overview of all transactions</p>
      </div>

      <div className="bg-[#2a2d3a] rounded-lg p-4">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-md overflow-hidden">
            <button className="bg-white text-black px-4 py-2 text-sm font-medium">All</button>
            <button className="bg-[#1c1e26] text-white px-4 py-2 text-sm font-medium">Earnings</button>
            <button className="bg-[#1c1e26] text-white px-4 py-2 text-sm font-medium">OutFlows</button>
          </div>
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
                <th className="text-left py-3 px-4">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              {[
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
              ].map((item, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-3 px-4">{item.desc}</td>
                  <td className="py-3 px-4">{item.account}</td>
                  <td className="py-3 px-4">12 May, 5:40pm</td>
                  <td className="py-3 px-4">TRX-87686</td>
                  <td className="py-3 px-4">{item.amount}</td>
                  <td className="py-3 px-4">{item.usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
