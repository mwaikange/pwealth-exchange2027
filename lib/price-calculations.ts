// Price Peg & HODL Logic for PeerWealth Shares

export interface PriceCalculationParams {
  lastWeekPrice: number
  pegGrowth?: number
  hodlPercentage: number
}

export interface ShareMetrics {
  totalSupply: number
  inCirculation: number
  listedForSale: number
  hodlPercentage: number
  currentPrice: number
  nextUpdateDate: string
}

/**
 * Calculate weekly share price using peg growth and HODL logic
 */
export function calculateWeeklyPrice(lastPrice: number, pegGrowth = 0.05, hodlPercent = 60): number {
  // Base pegged price (5% weekly growth)
  const peggedPrice = lastPrice * (1 + pegGrowth)

  // HODL multiplier: +/- based on how much above/below 50% HODL
  const multiplier = 1 + (hodlPercent - 50) / 100

  // Final price calculation
  const finalPrice = peggedPrice * multiplier

  return Math.round(finalPrice * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate HODL percentage based on supply and sell orders
 */
export function calculateHodlPercentage(totalSupply = 1000000, listedForSale = 22000): number {
  const hodlPercentage = ((totalSupply - listedForSale) / totalSupply) * 100
  return Math.round(hodlPercentage * 100) / 100 // Round to 2 decimal places
}

/**
 * Get next Monday 9:00 AM for price update
 */
export function getNextPriceUpdateDate(): string {
  const now = new Date()
  const nextMonday = new Date(now)

  // Calculate days until next Monday
  const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(9, 0, 0, 0)

  return nextMonday.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Get next Sunday 11:59 PM for order expiry
 */
export function getNextOrderExpiryDate(): string {
  const now = new Date()
  const nextSunday = new Date(now)

  // Calculate days until next Sunday
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7
  nextSunday.setDate(now.getDate() + daysUntilSunday)
  nextSunday.setHours(23, 59, 0, 0)

  return nextSunday.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Convert legacy token balance to new share balance
 * Legacy: 1 token = N$200
 * New: 1 share = N$100
 * Formula: new_shares = old_tokens * 2
 */
export function convertTokensToShares(tokenBalance: number): number {
  return tokenBalance * 2
}

/**
 * Calculate estimated NAD value of shares
 */
export function calculateShareValue(shares: number, pricePerShare = 100): number {
  return shares * pricePerShare
}

/**
 * Format currency in Namibian Dollars
 */
export function formatNAD(amount: number): string {
  return `N$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format shares with proper decimal places
 */
export function formatShares(shares: number): string {
  return `${shares.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} shares`
}

/**
 * Get current share metrics (mock data for now)
 */
export function getCurrentShareMetrics(): ShareMetrics {
  const totalSupply = 1000000
  const inCirculation = 1001
  const listedForSale = 22000
  const hodlPercentage = calculateHodlPercentage(totalSupply, listedForSale)
  const currentPrice = 100 // Static for now

  return {
    totalSupply,
    inCirculation,
    listedForSale,
    hodlPercentage,
    currentPrice,
    nextUpdateDate: getNextPriceUpdateDate(),
  }
}

/**
 * Validate minimum trade amount (0.01 shares = N$1.00)
 */
export function validateTradeAmount(
  shares: number,
  pricePerShare = 100,
): {
  valid: boolean
  error?: string
} {
  const minShares = 0.01
  const minValue = minShares * pricePerShare

  if (shares < minShares) {
    return {
      valid: false,
      error: `Minimum trade amount is ${minShares} shares (${formatNAD(minValue)})`,
    }
  }

  return { valid: true }
}
