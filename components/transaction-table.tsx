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
            <th className="text-left py-2 px-4 text-[11px] font-medium">Description</th>
            {showAccount && <th className="text-left py-2 px-4 text-[11px] font-medium">Account</th>}
            <th className="text-left py-2 px-4 text-[11px] font-medium">Date</th>
            {showReference && <th className="text-left py-2 px-4 text-[11px] font-medium">Reference</th>}
            {showRecipient && <th className="text-left py-2 px-4 text-[11px] font-medium">Peer-Email</th>}
            <th className="text-left py-2 px-4 text-[11px] font-medium">Amount (PWT)</th>
            <th className="text-left py-2 px-4 text-[11px] font-medium">Amount (USD)</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-gray-700">
              <td className="py-[6px] px-4 text-[10px]">
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
              {showAccount && <td className="py-[6px] px-4 text-[10px]">{transaction.account}</td>}
              <td className="py-[6px] px-4 text-[10px]">{transaction.date}</td>
              {showReference && <td className="py-[6px] px-4 text-[10px]">{transaction.reference}</td>}
              {showRecipient && (
                <td className="py-[6px] px-4 text-[10px]">
                  {["IN-PWT RECEIPT", "IN-AFT GIFT"].includes(transaction.type)
                    ? transaction.sender || "-"
                    : transaction.recipient || "-"}
                </td>
              )}
              <td className="py-[6px] px-4 text-[10px]">{transaction.amount} PWT</td>
              <td className="py-[6px] px-4 text-[10px]">{transaction.amountUsd} USD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
