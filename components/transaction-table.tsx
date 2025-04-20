"use client"

import type { useTransactions } from "@/contexts/transaction-context"

interface TransactionTableProps {
  transactions: ReturnType<typeof useTransactions>["transactions"]
  showAccount?: boolean
  compact?: boolean
}

export function TransactionTable({ transactions, showAccount = false, compact = false }: TransactionTableProps) {
  if (!transactions || transactions.length === 0) {
    return <div className="p-4 text-center text-gray-500">No transactions found</div>
  }

  return (
    <table className="w-full min-w-full divide-y divide-gray-700">
      <thead className="bg-[#1e2130]">
        <tr>
          <th
            className={`${compact ? "py-1" : "py-2"} px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider`}
          >
            Description
          </th>
          {showAccount && (
            <th
              className={`${compact ? "py-1" : "py-2"} px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider`}
            >
              Account
            </th>
          )}
          <th
            className={`${compact ? "py-1" : "py-2"} px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider`}
          >
            Date
          </th>
          <th
            className={`${compact ? "py-1" : "py-2"} px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider`}
          >
            Amount (PWT)
          </th>
          <th
            className={`${compact ? "py-1" : "py-2"} px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider`}
          >
            Amount (USD)
          </th>
          <th
            className={`${compact ? "py-1" : "py-2"} px-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider`}
          >
            Type
          </th>
        </tr>
      </thead>
      <tbody className="bg-[#2a2d3a] divide-y divide-gray-700">
        {transactions.map((transaction, index) => (
          <tr key={index} className="hover:bg-[#3a3d4a]">
            <td className={`${compact ? "py-1" : "py-2"} px-3 text-xs text-white`}>
              <div className="flex items-center">{transaction.type}</div>
            </td>
            {showAccount && (
              <td className={`${compact ? "py-1" : "py-2"} px-3 text-xs text-white`}>{transaction.account}</td>
            )}
            <td className={`${compact ? "py-1" : "py-2"} px-3 text-xs text-white`}>{transaction.date}</td>
            <td className={`${compact ? "py-1" : "py-2"} px-3 text-xs text-right text-white`}>
              {transaction.amount} PWT
            </td>
            <td className={`${compact ? "py-1" : "py-2"} px-3 text-xs text-right text-white`}>
              {transaction.amountUsd} USD
            </td>
            <td className={`${compact ? "py-1" : "py-2"} px-3 text-xs text-center`}>
              <span
                className={
                  ["IN-PWT RECEIPT", "REFERRAL CLAIM", "BUY-AFT RECEIPT", "IN-AFT GIFT", "CLAIM"].includes(
                    transaction.type,
                  )
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {["IN-PWT RECEIPT", "REFERRAL CLAIM", "BUY-AFT RECEIPT", "IN-AFT GIFT", "CLAIM"].includes(
                  transaction.type,
                )
                  ? "+"
                  : "-"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
