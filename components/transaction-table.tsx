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
  // Helper function to safely check if a transaction type is in a list
  const isTypeInList = (type: string | undefined, list: string[]): boolean => {
    return type ? list.includes(type) : false
  }

  // Helper function to format transaction type display
  const formatTransactionType = (transaction: Transaction): string => {
    const type = transaction.type || transaction.transaction_type || "Unknown"

    if (type === "AFT Gift") return "OUT-PWT Transfer"
    if (type === "PWT Transfer") return "OUT-AFT GIFT"

    if (typeof type === "string" && type.startsWith("REFERRAL CLAIM")) {
      if (type.includes("Level 1")) return "REFERRAL CLAIM-LvL1"
      if (type.includes("Level 2")) return "REFERRAL CLAIM-LvL2"
      if (type.includes("Level 3")) return "REFERRAL CLAIM-LvL3"
      return "REFERRAL CLAIM"
    }

    return transaction.description || type
  }

  // List of transaction types that should show a plus sign
  const positiveTypes = [
    "IN-PWT RECEIPT",
    "REFERRAL CLAIM-LvL1",
    "REFERRAL CLAIM-LvL2",
    "REFERRAL CLAIM-LvL3",
    "REFERRAL CLAIM",
    "BUY-AFT RECEIPT",
    "IN-AFT GIFT",
    "CLAIM",
  ]

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
          {transactions.map((transaction) => {
            const transactionType = transaction.type || transaction.transaction_type || "Unknown"
            const isPositive = isTypeInList(transactionType, positiveTypes)

            return (
              <tr key={transaction.id} className="border-b border-gray-700">
                <td className="py-[6px] px-4 text-[10px]">
                  <span className={isPositive ? "text-green-400" : "text-red-400"}>{isPositive ? "+" : "-"}</span>{" "}
                  {formatTransactionType(transaction)}
                </td>
                {showAccount && <td className="py-[6px] px-4 text-[10px]">{transaction.account}</td>}
                <td className="py-[6px] px-4 text-[10px]">{transaction.date}</td>
                {showReference && <td className="py-[6px] px-4 text-[10px]">{transaction.reference}</td>}
                {showRecipient && (
                  <td className="py-[6px] px-4 text-[10px]">
                    {isTypeInList(transactionType, ["IN-PWT RECEIPT", "IN-AFT GIFT"])
                      ? transaction.sender || "-"
                      : transaction.recipient || "-"}
                  </td>
                )}
                <td className="py-[6px] px-4 text-[10px]">{transaction.amount} PWT</td>
                <td className="py-[6px] px-4 text-[10px]">{transaction.amountUsd} USD</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
