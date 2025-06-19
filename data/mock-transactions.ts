export interface Transaction {
  id: string
  type: string
  description: string
  amount?: number // NAD amount
  shares?: number // Share amount
  status: "completed" | "pending" | "failed" | "expired" | "cancelled"
  date: string
  reference: string
  from_wallet?: string
  to_wallet?: string
  price_per_share?: number
  buyer?: string
  seller?: string
}

export const mockTransactions: Transaction[] = [
  {
    id: "txn-001",
    type: "WALLET_TOPUP",
    description: "NAD added to Buy Wallet",
    amount: 1000,
    status: "completed",
    date: "2025-01-19 14:30",
    reference: "TRX-87691",
    to_wallet: "Buy Wallet",
  },
  {
    id: "txn-002",
    type: "BUY_ORDER_PLACED",
    description: "Buy order placed for shares",
    amount: 500,
    shares: 5,
    price_per_share: 100,
    status: "completed",
    date: "2025-01-19 10:15",
    reference: "TRX-87690",
    from_wallet: "Buy Wallet",
  },
  {
    id: "txn-003",
    type: "ORDER_MATCHED",
    description: "Buy/Sell order matched",
    shares: 3,
    amount: 300,
    price_per_share: 100,
    status: "completed",
    date: "2025-01-18 11:45",
    reference: "TRX-87689",
    buyer: "You",
    seller: "User456",
  },
  {
    id: "txn-004",
    type: "VESTING",
    description: "Shares vested - Retail Level",
    shares: 25,
    status: "pending",
    date: "2025-01-17 09:00",
    reference: "TRX-87688",
    from_wallet: "Pre-Hold",
    to_wallet: "Vesting (5 days)",
  },
  {
    id: "txn-005",
    type: "CLAIM",
    description: "Vested shares claimed",
    shares: 15,
    status: "completed",
    date: "2025-01-16 12:00",
    reference: "TRX-87687",
    from_wallet: "Vesting",
    to_wallet: "Post-Hold",
  },
  {
    id: "txn-006",
    type: "SELL_ORDER_PLACED",
    description: "Sell order listed on exchange",
    shares: 10,
    amount: 1050,
    price_per_share: 105,
    status: "pending",
    date: "2025-01-15 16:20",
    reference: "TRX-87686",
    from_wallet: "Post-Hold",
  },
  {
    id: "txn-007",
    type: "REFERRAL_BONUS",
    description: "Referral bonus shares credited",
    shares: 2,
    status: "completed",
    date: "2025-01-14 08:30",
    reference: "TRX-87685",
    to_wallet: "Pre-Hold",
  },
  {
    id: "txn-008",
    type: "CASHOUT_REQUESTED",
    description: "NAD withdrawal to bank account",
    amount: 800,
    status: "pending",
    date: "2025-01-13 13:45",
    reference: "TRX-87684",
    from_wallet: "Cashout Wallet",
  },
  {
    id: "txn-009",
    type: "ORDER_CANCELLED",
    description: "Buy order cancelled by user",
    shares: 5,
    amount: 500,
    price_per_share: 100,
    status: "cancelled",
    date: "2025-01-12 11:00",
    reference: "TRX-87683",
    to_wallet: "Buy Wallet",
  },
  {
    id: "txn-010",
    type: "ORDER_EXPIRED",
    description: "Sell order expired - shares returned",
    shares: 8,
    amount: 840,
    price_per_share: 105,
    status: "expired",
    date: "2025-01-11 23:59",
    reference: "TRX-87682",
    to_wallet: "Post-Hold",
  },
  {
    id: "txn-011",
    type: "REFERRAL_CLAIM",
    description: "Referral commission claimed",
    shares: 5,
    status: "completed",
    date: "2025-01-10 14:15",
    reference: "TRX-87681",
    to_wallet: "Cashout Wallet",
  },
  {
    id: "txn-012",
    type: "VESTING",
    description: "Shares vested - Small Business Level",
    shares: 100,
    status: "completed",
    date: "2025-01-09 10:30",
    reference: "TRX-87680",
    from_wallet: "Pre-Hold",
    to_wallet: "Vesting (30 days)",
  },
]

export const getTransactionTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    WALLET_TOPUP: "bg-green-100 text-green-800",
    BUY_ORDER_PLACED: "bg-blue-100 text-blue-800",
    SELL_ORDER_PLACED: "bg-purple-100 text-purple-800",
    ORDER_MATCHED: "bg-emerald-100 text-emerald-800",
    ORDER_EXPIRED: "bg-gray-100 text-gray-800",
    ORDER_CANCELLED: "bg-red-100 text-red-800",
    VESTING: "bg-amber-100 text-amber-800",
    CLAIM: "bg-teal-100 text-teal-800",
    CASHOUT_REQUESTED: "bg-indigo-100 text-indigo-800",
    REFERRAL_BONUS: "bg-pink-100 text-pink-800",
    REFERRAL_CLAIM: "bg-cyan-100 text-cyan-800",
  }
  return colors[type] || "bg-gray-100 text-gray-800"
}

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}
