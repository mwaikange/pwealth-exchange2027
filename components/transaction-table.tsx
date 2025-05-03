"use client"

import type { Transaction } from "@/contexts/transaction-context"

interface TransactionTableProps {
  transactions: Transaction[]
  showRecipient?: boolean
  showAccount?: boolean
  showReference?: boolean
  compact?: boolean
}

type TransactionType =
  | "IN-PWT RECEIPT"
  | "REFERRAL CLAIM"
  | "BUY-AFT RECEIPT"
  | "IN-AFT GIFT"
  | "CLAIM"
  | "AFT-TopUP"
  | "OUT-TRANSFER"
  | "OUT-AFT GIFT"
  | "ACTIVATE FEE"
  | "VESTING"
  | string

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
    const isPositive = isPositiveTransaction(transaction)
    const prefix = isPositive ? "+ " : "- "

    // Standardize display names
    if (type === "AFT Gift" || type === "OUT-AFT GIFT") return `${prefix}OUT-AFT GIFT`
    if (type === "PWT Transfer" || type === "OUT-PWT Transfer") return `${prefix}OUT-PWT Transfer`
    if (type === "AFT-TopUP") return `${prefix}AFT-TopUP`
    if (type === "IN-PWT RECEIPT") return `${prefix}IN-PWT RECEIPT`
    if (type === "BUY-AFT RECEIPT") return `${prefix}BUY-AFT RECEIPT`
    if (type === "IN-AFT GIFT") return `${prefix}IN-AFT GIFT`
    if (type === "CLAIM") return `${prefix}CLAIM`
    if (type === "OUT-TRANSFER") return `${prefix}OUT-TRANSFER`
    if (type === "VESTING") return `${prefix}VESTING`

    // Handle ACTIVATE FEE with level information
    if (type === "ACTIVATE FEE") {
      // Try to extract level number and letter from description or reference
      const levelMatch =
        transaction.description?.match(/LEVEL(\d+)[-\s]*([A-Z])?/) ||
        transaction.reference?.match(/LEVEL(\d+)[-\s]*([A-Z])?/)

      if (levelMatch) {
        const levelNumber = levelMatch[1] || "2"
        const levelLetter = levelMatch[2] || "A"
        return `${prefix}ACTIVATE FEE - LEVEL${levelNumber}-${levelLetter}`
      }

      // Default if no match found
      return `${prefix}ACTIVATE FEE - LEVEL2-A`
    }

    // Handle REFERRAL CLAIM with level information
    if (typeof type === "string" && type.startsWith("REFERRAL CLAIM")) {
      if (transaction.description?.includes("LVL1") || type.includes("Level 1")) return `${prefix}REFERRAL CLAIM-LvL1`
      if (transaction.description?.includes("LVL2") || type.includes("Level 2")) return `${prefix}REFERRAL CLAIM-LvL2`
      if (transaction.description?.includes("LVL3") || type.includes("Level 3")) return `${prefix}REFERRAL CLAIM-LvL3`

      // Extract level from description if available
      const levelMatch = transaction.description?.match(/LVL(\d+)/)
      if (levelMatch) {
        return `${prefix}REFERRAL CLAIM-LvL${levelMatch[1]}`
      }

      return `${prefix}REFERRAL CLAIM`
    }

    // Default case: use description or type
    return `${prefix}${transaction.description || type}`
  }

  // List of transaction types that should show a plus sign (incoming transactions)
  const positiveTypes = [
    "IN-PWT RECEIPT",
    "REFERRAL CLAIM-LvL1",
    "REFERRAL CLAIM-LvL2",
    "REFERRAL CLAIM-LvL3",
    "REFERRAL CLAIM",
    "BUY-AFT RECEIPT",
    "IN-AFT GIFT",
    "CLAIM",
    "AFT-TopUP",
  ]

  // Check if a transaction is positive (incoming)
  const isPositiveTransaction = (transaction: Transaction): boolean => {
    const type = transaction.type || transaction.transaction_type

    if (!type) return false

    // Check if it's in our positive types list
    if (positiveTypes.includes(type)) return true

    // Check if it starts with any of our positive prefixes
    if (
      type.startsWith("REFERRAL CLAIM") ||
      type.startsWith("IN-") ||
      type === "CLAIM" ||
      type === "BUY-AFT RECEIPT" ||
      type === "AFT-TopUP"
    ) {
      return true
    }

    return false
  }

  // Update the getTransactionColor function to add color for AFT-TopUP transactions
  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case "IN-PWT RECEIPT":
      case "REFERRAL CLAIM":
      case "BUY-AFT RECEIPT":
      case "IN-AFT GIFT":
      case "CLAIM":
      case "AFT-TopUP": // <-- Add this case to show AFT-TopUP as green
        return "bg-green-500"
      case "OUT-TRANSFER":
      case "OUT-AFT GIFT":
      case "ACTIVATE FEE":
      case "VESTING":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // Helper function to check if a transaction is AFT-related
  const isAftTransaction = (transaction: Transaction): boolean => {
    const type = transaction.type || transaction.transaction_type || ""
    return (
      type.includes("AFT") || type === "ACTIVATE FEE" || (transaction.account && transaction.account.includes("AFT"))
    )
  }

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
            const isPositive = isPositiveTransaction(transaction)

            return (
              <tr key={transaction.id} className="border-b border-gray-700">
                <td className="py-[6px] px-4 text-[10px]">{formatTransactionType(transaction)}</td>
                {showAccount && <td className="py-[6px] px-4 text-[10px]">{transaction.account}</td>}
                <td className="py-[6px] px-4 text-[10px]">{transaction.date}</td>
                {showReference && <td className="py-[6px] px-4 text-[10px]">{transaction.reference}</td>}
                {showRecipient && (
                  <td className="py-[6px] px-4 text-[10px]">
                    {isTypeInList(transaction.type || transaction.transaction_type, ["IN-PWT RECEIPT", "IN-AFT GIFT"])
                      ? transaction.sender || "-"
                      : transaction.recipient || "-"}
                  </td>
                )}
                <td className="py-[6px] px-4 text-[10px]">
                  {transaction.amount} {isAftTransaction(transaction) ? "AFT" : "PWT"}
                </td>
                <td className="py-[6px] px-4 text-[10px]">{transaction.amountUsd} USD</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
