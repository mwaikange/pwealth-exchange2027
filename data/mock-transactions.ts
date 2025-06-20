export type TransactionType =
  | "WALLET_TOPUP"
  | "BUY_ORDER_PLACED"
  | "SELL_ORDER_PLACED"
  | "ORDER_MATCHED"
  | "ORDER_EXPIRED"
  | "ORDER_CANCELLED"
  | "VESTING"
  | "CLAIM"
  | "CASHOUT_REQUESTED"
  | "REFERRAL_BONUS"
  | "REFERRAL_CLAIM"

export interface Transaction {
  id: number
  type: TransactionType
  description: string
  amount?: number // NAD amount
  shares?: number // Share amount
  status: "completed" | "pending" | "started" | "expired" | "cancelled"
  date: string
  reference: string
  from?: string
  to?: string
  buyer?: string
  seller?: string
  price?: number
}

export const mockTransactions: Transaction[] = [
  {
    id: 1,
    type: "WALLET_TOPUP",
    description: "NAD added to Buy Wallet via mobile payment",
    amount: 1500,
    status: "completed",
    date: "2025-01-20 14:30",
    reference: "TXN-WLT-789012",
    to: "buy_wallet",
  },
  {
    id: 2,
    type: "BUY_ORDER_PLACED",
    description: "Buy order placed for 15 shares",
    amount: 1500,
    shares: 15,
    status: "completed",
    date: "2025-01-20 14:45",
    reference: "ORD-BUY-345678",
    from: "buy_wallet",
  },
  {
    id: 3,
    type: "ORDER_MATCHED",
    description: "Buy/Sell order matched - 10 shares traded",
    amount: 1000,
    shares: 10,
    status: "completed",
    date: "2025-01-20 15:00",
    reference: "MTH-789123",
    buyer: "current-user",
    seller: "user-456",
    price: 100,
  },
  {
    id: 4,
    type: "VESTING",
    description: "12 shares vested in Retail slot for 5 days",
    shares: 12,
    status: "started",
    date: "2025-01-19 09:15",
    reference: "VST-RTL-456789",
    from: "hold_wallet_pre_hold",
  },
  {
    id: 5,
    type: "CLAIM",
    description: "8 shares claimed from completed vesting",
    shares: 8,
    status: "completed",
    date: "2025-01-18 10:30",
    reference: "CLM-RTL-234567",
    to: "hold_wallet_post_hold",
  },
  {
    id: 6,
    type: "SELL_ORDER_PLACED",
    description: "Sell order placed for 5 shares",
    shares: 5,
    status: "pending",
    date: "2025-01-20 16:20",
    reference: "ORD-SEL-567890",
    from: "hold_wallet_post_hold",
  },
  {
    id: 7,
    type: "REFERRAL_BONUS",
    description: "Referral bonus: 2 shares credited",
    shares: 2,
    status: "completed",
    date: "2025-01-17 11:45",
    reference: "REF-BON-123456",
    to: "hold_wallet_pre_hold",
  },
  {
    id: 8,
    type: "CASHOUT_REQUESTED",
    description: "Cashout request to mobile money",
    amount: 500,
    status: "pending",
    date: "2025-01-20 17:00",
    reference: "CSH-OUT-890123",
    from: "cashout_wallet",
  },
  {
    id: 9,
    type: "VESTING",
    description: "150 shares vested in Small Business slot for 30 days",
    shares: 150,
    status: "started",
    date: "2025-01-15 08:00",
    reference: "VST-SMB-345678",
    from: "hold_wallet_pre_hold",
  },
  {
    id: 10,
    type: "ORDER_EXPIRED",
    description: "Buy order expired - 3 shares, funds returned",
    amount: 300,
    shares: 3,
    status: "expired",
    date: "2025-01-14 23:59",
    reference: "ORD-EXP-678901",
    to: "buy_wallet",
  },
  {
    id: 11,
    type: "REFERRAL_CLAIM",
    description: "Referral reward claimed: 4 shares",
    shares: 4,
    status: "completed",
    date: "2025-01-16 13:20",
    reference: "REF-CLM-456789",
    to: "hold_wallet_pre_hold",
  },
  {
    id: 12,
    type: "ORDER_CANCELLED",
    description: "Sell order cancelled by user - 7 shares returned",
    shares: 7,
    status: "cancelled",
    date: "2025-01-19 20:15",
    reference: "ORD-CAN-789012",
    to: "hold_wallet_post_hold",
  },
  {
    id: 13,
    type: "VESTING",
    description: "600 shares vested in Corporate slot for 90 days",
    shares: 600,
    status: "started",
    date: "2025-01-10 07:30",
    reference: "VST-CRP-567890",
    from: "hold_wallet_pre_hold",
  },
  {
    id: 14,
    type: "ORDER_MATCHED",
    description: "Sell order matched - 25 shares sold",
    amount: 2500,
    shares: 25,
    status: "completed",
    date: "2025-01-18 14:45",
    reference: "MTH-SEL-234567",
    buyer: "user-789",
    seller: "current-user",
    price: 100,
  },
]

export function getTransactionTypeConfig(type: TransactionType) {
  const configs = {
    WALLET_TOPUP: {
      icon: "💰",
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      category: "Wallet",
    },
    BUY_ORDER_PLACED: {
      icon: "🛒",
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      category: "Trading",
    },
    SELL_ORDER_PLACED: {
      icon: "📤",
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      category: "Trading",
    },
    ORDER_MATCHED: {
      icon: "🤝",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      category: "Trading",
    },
    ORDER_EXPIRED: {
      icon: "⏰",
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      category: "Trading",
    },
    ORDER_CANCELLED: {
      icon: "❌",
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      category: "Trading",
    },
    VESTING: {
      icon: "🔒",
      color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      category: "Vesting",
    },
    CLAIM: {
      icon: "✅",
      color: "bg-teal-500/20 text-teal-400 border-teal-500/30",
      category: "Vesting",
    },
    CASHOUT_REQUESTED: {
      icon: "🏦",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      category: "Wallet",
    },
    REFERRAL_BONUS: {
      icon: "🎁",
      color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      category: "Referral",
    },
    REFERRAL_CLAIM: {
      icon: "🏆",
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      category: "Referral",
    },
  }

  return configs[type] || configs.WALLET_TOPUP
}
