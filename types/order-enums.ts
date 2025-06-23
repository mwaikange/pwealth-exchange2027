// Valid enum values for order status
export const ORDER_STATUS = {
  // Buy order statuses
  BUY: {
    PENDING: "pending",
    PARTIAL: "partial",
    COMPLETED: "completed",
    FILLED: "filled",
    CANCELLED: "cancelled",
  },
  // Sell order statuses
  SELL: {
    AVAILABLE: "available",
    PARTIAL: "partial",
    COMPLETED: "completed",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
  },
} as const

// Type definitions
export type BuyOrderStatus = (typeof ORDER_STATUS.BUY)[keyof typeof ORDER_STATUS.BUY]
export type SellOrderStatus = (typeof ORDER_STATUS.SELL)[keyof typeof ORDER_STATUS.SELL]

// Helper functions for filtering
export const getMarketBuyOrderStatuses = (): BuyOrderStatus[] => [
  ORDER_STATUS.BUY.PENDING,
  ORDER_STATUS.BUY.PARTIAL,
  ORDER_STATUS.BUY.FILLED,
]

export const getMarketSellOrderStatuses = (): SellOrderStatus[] => [
  ORDER_STATUS.SELL.AVAILABLE,
  ORDER_STATUS.SELL.PARTIAL,
]

export const getUserBuyOrderStatuses = (): BuyOrderStatus[] => [
  ORDER_STATUS.BUY.PENDING,
  ORDER_STATUS.BUY.PARTIAL,
  ORDER_STATUS.BUY.COMPLETED,
  ORDER_STATUS.BUY.FILLED,
]

export const getUserSellOrderStatuses = (): SellOrderStatus[] => [
  ORDER_STATUS.SELL.AVAILABLE,
  ORDER_STATUS.SELL.PARTIAL,
  ORDER_STATUS.SELL.COMPLETED,
]
