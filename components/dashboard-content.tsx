"use client"

import { useContext } from "react"
import { WalletContext } from "@/context/WalletContext"
import { formatCurrency } from "@/lib/utils"

const DashboardContent = () => {
  const { balance, transactions } = useContext(WalletContext)

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <div className="bg-white shadow-md rounded-md p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Balance</h3>
        <p className="text-gray-700">{formatCurrency(balance)}</p>
      </div>
      <div className="bg-white shadow-md rounded-md p-4">
        <h3 className="text-lg font-semibold mb-2">Transactions</h3>
        <ul>
          {transactions.map((transaction) => (
            <li key={transaction.id} className="py-2 border-b last:border-b-0">
              {transaction.description} - {formatCurrency(transaction.amount)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default DashboardContent
