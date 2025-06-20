export interface SharesSupply {
  totalSupply: number
  circulating: number
  currentPrice: number
  minTrade: number
  minWithdrawal: number
  currency: string
}

// Mock shares supply data (will be replaced with Supabase query later)
export const mockSharesSupply: SharesSupply = {
  totalSupply: 1000000, // 1 million shares
  circulating: 1001, // Currently in circulation
  currentPrice: 100, // N$100 per share
  minTrade: 50, // N$50 minimum trade
  minWithdrawal: 100, // N$100 minimum withdrawal
  currency: "NAD",
}

export function getSharesSupplyData(): SharesSupply {
  // In the future, this will fetch from Supabase:
  // const { data } = await supabase.from('shares_supply').select('*').single()
  return mockSharesSupply
}

export function formatNAD(amount: number): string {
  return `N$${amount.toLocaleString("en-NA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatShares(shares: number): string {
  return `${shares.toLocaleString("en-NA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} shares`
}
