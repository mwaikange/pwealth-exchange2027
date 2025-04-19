"use client"

import type { Transaction } from "@/contexts/transaction-context"

interface TransactionTableProps {
  transactions: Transaction[]
  showRecipient?: boolean
  showAccount?: boolean
  showReference?: boolean
  compact?: boolean
}

export function TransactionTable({
  transactions,
  showRecipient = true,
  showAccount = true,
  showReference = true,
  compact = false,
}: TransactionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700 bg-[#1c1e26]">
            <th className="text-left py-2 px-4 font-medium">Description</th>
            {showAccount && <th className="text-left py-2 px-4 font-medium">Account</th>}
            <th className="text-left py-2 px-4 font-medium">Date</th>
            {showReference && <th className="text-left py-2 px-4 font-medium">Reference</th>}
            {showRecipient && <th className="text-left py-2 px-4 font-medium">Recipient</th>}
            <th className="text-left py-2 px-4 font-medium">Amount (PWT)</th>
            <th className="text-left py-2 px-4 font-medium">Amount (USD)</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-gray-700">
              <td className="py-2 px-4">
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
                </span>{" "}
                {transaction.description || transaction.type}
              </td>
              {showAccount && <td className="py-2 px-4">{transaction.account}</td>}
              <td className="py-2 px-4">{transaction.date}</td>
              {showReference && <td className="py-2 px-4">{transaction.reference}</td>}
              {showRecipient && <td className="py-2 px-4">{transaction.recipient || "-"}</td>}
              <td className="py-2 px-4">{transaction.amount} PWT</td>
              <td className="py-2 px-4">{transaction.amountUsd} USD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
