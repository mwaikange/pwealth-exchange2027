export interface SellOrder {
  id: string
  userId: string
  shares: number
  pricePerShare: number
  status: "active" | "queued" | "partially_filled" | "filled" | "expired"
  createdAt: Date
  filledShares: number
}

export interface BuyOrder {
  id: string
  userId: string
  totalAmount: number
  pricePerShare: number
  status: "active" | "queued" | "partially_filled" | "filled" | "expired"
  createdAt: Date
  filledAmount: number
}

export interface MatchResult {
  buyOrderId: string
  sellOrderId: string
  shares: number
  pricePerShare: number
  totalAmount: number
  buyerUserId: string
  sellerUserId: string
}

export const matchBuyOrder = (
  buyOrder: BuyOrder,
  sellOrders: SellOrder[],
): { matches: MatchResult[]; updatedSellOrders: SellOrder[] } => {
  const matches: MatchResult[] = []
  const updatedSellOrders = [...sellOrders]

  const remainingAmount = buyOrder.totalAmount - buyOrder.filledAmount
  const targetShares = Math.floor(remainingAmount / buyOrder.pricePerShare)
  let sharesNeeded = targetShares

  // Sort sell orders by creation date (FIFO)
  const activeSellOrders = updatedSellOrders
    .filter((order) => order.status === "active" && order.shares > order.filledShares)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  for (let i = 0; i < activeSellOrders.length && sharesNeeded > 0; i++) {
    const sellOrder = activeSellOrders[i]
    const availableShares = sellOrder.shares - sellOrder.filledShares
    const sharesToMatch = Math.min(sharesNeeded, availableShares)

    if (sharesToMatch > 0) {
      // Create match
      const match: MatchResult = {
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        shares: sharesToMatch,
        pricePerShare: buyOrder.pricePerShare,
        totalAmount: sharesToMatch * buyOrder.pricePerShare,
        buyerUserId: buyOrder.userId,
        sellerUserId: sellOrder.userId,
      }

      matches.push(match)

      // Update sell order
      const sellOrderIndex = updatedSellOrders.findIndex((o) => o.id === sellOrder.id)
      if (sellOrderIndex !== -1) {
        updatedSellOrders[sellOrderIndex] = {
          ...sellOrder,
          filledShares: sellOrder.filledShares + sharesToMatch,
          status: sellOrder.filledShares + sharesToMatch >= sellOrder.shares ? "filled" : "partially_filled",
        }
      }

      sharesNeeded -= sharesToMatch
    }
  }

  return { matches, updatedSellOrders }
}

export const calculateSharePrice = (): number => {
  // Mock share price - in real implementation this would be dynamic
  return 100 // N$100 per share
}
