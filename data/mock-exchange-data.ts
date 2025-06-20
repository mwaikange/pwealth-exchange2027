import type { SellOrder, BuyOrder } from "@/utils/match-orders"

export const mockSellOrders: SellOrder[] = [
  {
    id: "sell-001",
    userId: "user-001",
    shares: 20, // Updated to realistic share amounts
    pricePerShare: 100,
    status: "active",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    filledShares: 2,
  },
  {
    id: "sell-002",
    userId: "user-002",
    shares: 10,
    pricePerShare: 100,
    status: "active",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    filledShares: 0,
  },
  {
    id: "sell-003",
    userId: "user-003",
    shares: 30,
    pricePerShare: 100,
    status: "queued",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    filledShares: 0,
  },
  {
    id: "sell-004",
    userId: "user-004",
    shares: 16,
    pricePerShare: 100,
    status: "filled",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    filledShares: 16,
  },
]

export const mockBuyOrders: BuyOrder[] = [
  {
    id: "buy-001",
    userId: "current-user",
    totalAmount: 2000, // N$2000 for 20 shares
    pricePerShare: 100,
    status: "active",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    filledAmount: 1800, // 18 shares filled
  },
  {
    id: "buy-002",
    userId: "current-user",
    totalAmount: 1000, // N$1000 for 10 shares
    pricePerShare: 100,
    status: "filled",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    filledAmount: 1000, // Fully filled
  },
]
