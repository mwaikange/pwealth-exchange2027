import type { SellOrder, BuyOrder } from "@/utils/match-orders"

export const mockSellOrders: SellOrder[] = [
  {
    id: "sell-001",
    userId: "user-001",
    shares: 10,
    pricePerShare: 100,
    status: "active",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    filledShares: 1,
  },
  {
    id: "sell-002",
    userId: "user-002",
    shares: 5,
    pricePerShare: 100,
    status: "active",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    filledShares: 0,
  },
  {
    id: "sell-003",
    userId: "user-003",
    shares: 15,
    pricePerShare: 100,
    status: "queued",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    filledShares: 0,
  },
  {
    id: "sell-004",
    userId: "user-004",
    shares: 8,
    pricePerShare: 100,
    status: "filled",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    filledShares: 8,
  },
]

export const mockBuyOrders: BuyOrder[] = [
  {
    id: "buy-001",
    userId: "current-user",
    totalAmount: 1000,
    pricePerShare: 100,
    status: "active",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    filledAmount: 900,
  },
  {
    id: "buy-002",
    userId: "current-user",
    totalAmount: 500,
    pricePerShare: 100,
    status: "filled",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    filledAmount: 500,
  },
]
