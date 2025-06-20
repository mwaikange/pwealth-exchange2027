export interface Transaction {
  id: string
  type: string
  description: string
  amount?: number // NAD amount
  shares?: number // Share amount
  price?: number // Price per share
  status: "completed" | "pending" | "started" | "expired" | "cancelled"
  date: string
  reference: string
  from_wallet?: string
  to_wallet?: string
  buyer?: string
  seller?: string
}

export const mockTransactions: Transaction[] = [
  {
    id: "tx-001",
    type: "WALLET_TOPUP",
    description: "NAD added to Buy Wallet",
    amount: 1000,
    status: "completed",
    date: "2025-01-20 14:30",
    reference: "TXN-WLT-001",
    to_wallet: "Buy Wallet",
  },
  {
    id: "tx-002",
    type: "BUY_ORDER_PLACED",
    description: "Buy order placed for shares",
    amount: 500,
    shares: 5,
    price: 100,
    status: "completed",
    date: "2025-01-20 10:15",
    reference: "TXN-BUY-002",
    from_wallet: "Buy Wallet",
  },
  {
    id: "tx-003",
    type: "ORDER_MATCHED",
    description: "Buy/Sell order matched",
    shares: 5,
    price: 100,
    amount: 500,
    status: "completed",
    date: "2025-01-20 10:16",
    reference: "TXN-MATCH-003",
    buyer: "You",
    seller: "User456",
  },
  {
    id: "tx-004",
    type: "VESTING",
    description: "Shares vested (Retail Level)",
    shares: 25,
    status: "started",
    date: "2025-01-19 09:00",
    reference: "TXN-VEST-004",
    from_wallet: "Pre-Hold",
    to_wallet: "Vesting Slot 1",
  },
  {
    id: "tx-005",
    type: "SELL_ORDER_PLACED",
    description: "Sell order listed on exchange",
    shares: 10,
    price: 105,
    amount: 1050,
    status: "pending",
    date: "2025-01-19 16:45",
    reference: "TXN-SELL-005",
    from_wallet: "Post-Hold",
  },
  {
    id: "tx-006",
    type: "CLAIM",
    description: "Vested shares claimed (Retail Level)",
    shares: 15,
    status: "completed",
    date: "2025-01-18 11:20",
    reference: "TXN-CLAIM-006",
    from_wallet: "Vesting Slot 4",
    to_wallet: "Post-Hold",
  },
  {
    id: "tx-007",
    type: "REFERRAL_BONUS",
    description: "Referral bonus shares credited",
    shares: 2,
    status: "completed",
    date: "2025-01-18 08:30",
    reference: "TXN-REF-007",
    to_wallet: "Pre-Hold",
  },
  {
    id: "tx-008",
    type: "VESTING",
    description: "Shares vested (Small Business Level)",
    shares: 100,
    status: "started",
    date: "2025-01-17 14:15",
    reference: "TXN-VEST-008",
    from_wallet: "Pre-Hold",
    to_wallet: "Vesting Slot 2",
  },
  {
    id: "tx-009",
    type: "CASHOUT_REQUESTED",
    description: "NAD withdrawal to mobile money",
    amount: 800,
    status: "pending",
    date: "2025-01-17 12:00",
    reference: "TXN-CASH-009",
    from_wallet: "Cashout Wallet",
  },
  {
    id: "tx-010",
    type: "ORDER_CANCELLED",
    description: "Buy order cancelled",
    shares: 3,
    price: 98,
    amount: 294,
    status: "cancelled",
    date: "2025-01-16 15:30",
    reference: "TXN-CANC-010",
    to_wallet: "Buy Wallet",
  },
  {
    id: "tx-011",
    type: "VESTING",
    description: "Shares vested (Corporate Level)",
    shares: 750,
    status: "started",
    date: "2025-01-16 10:45",
    reference: "TXN-VEST-011",
    from_wallet: "Pre-Hold",
    to_wallet: "Vesting Slot 3",
  },
  {
    id: "tx-012",
    type: "REFERRAL_CLAIM",
    description: "Referral claim reward",
    shares: 5,
    status: "completed",
    date: "2025-01-15 13:20",
    reference: "TXN-RCLAIM-012",
    to_wallet: "Cashout Wallet",
  },
  {
    id: "tx-013",
    type: "ORDER_EXPIRED",
    description: "Sell order expired",
    shares: 8,
    price: 102,
    amount: 816,
    status: "expired",
    date: "2025-01-15 09:00",
    reference: "TXN-EXP-013",
    to_wallet: "Post-Hold",
  },
  {
    id: "tx-014",
    type: "CLAIM",
    description: "Vested shares claimed (Small Business Level)",
    shares: 200,
    status: "completed",
    date: "2025-01-14 16:30",
    reference: "TXN-CLAIM-014",
    from_wallet: "Vesting Slot 5",
    to_wallet: "Post-Hold",
  },
]

export const getTransactionTypeConfig = (type: string) => {
  const configs = {
    WALLET_TOPUP: {
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: "💰",
      category: "Wallet",
    },
    BUY_ORDER_PLACED: {
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: "🛒",
      category: "Trading",
    },
    SELL_ORDER_PLACED: {
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: "📤",
      category: "Trading",
    },
    ORDER_MATCHED: {
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      icon: "🤝",
      category: "Trading",
    },
    ORDER_EXPIRED: {
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      icon: "⏰",
      category: "Trading",
    },
    ORDER_CANCELLED: {
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: "❌",
      category: "Trading",
    },
    VESTING: {
      color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      icon: "🔒",
      category: "Vesting",
    },
    CLAIM: {
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "✅",
      category: "Vesting",
    },
    CASHOUT_REQUESTED: {
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: "🏦",
      category: "Wallet",
    },
    REFERRAL_BONUS: {
      color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      icon: "🎁",
      category: "Referral",
    },
    REFERRAL_CLAIM: {
      color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      icon: "🏆",
      category: "Referral",
    },
  }

  return (
    configs[type as keyof typeof configs] || {
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      icon: "📄",
      category: "Other",
    }
  )
}
