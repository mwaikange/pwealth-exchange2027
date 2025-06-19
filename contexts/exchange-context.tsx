"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import type { SellOrder, BuyOrder } from "@/utils/match-orders"
import { matchBuyOrder, calculateSharePrice } from "@/utils/match-orders"
import { mockSellOrders, mockBuyOrders } from "@/data/mock-exchange-data"
import { useWallet } from "@/contexts/wallet-context"

interface ExchangeContextType {
  // Orders
  sellOrders: SellOrder[]
  buyOrders: BuyOrder[]
  userSellOrders: SellOrder[]
  userBuyOrders: BuyOrder[]

  // Actions
  placeBuyOrder: (amount: number) => Promise<{ success: boolean; message: string }>
  placeSellOrder: (shares: number) => Promise<{ success: boolean; message: string }>

  // Market data
  currentSharePrice: number

  // Loading states
  loading: boolean
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [sellOrders, setSellOrders] = useState<SellOrder[]>(mockSellOrders)
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>(mockBuyOrders)
  const [loading, setLoading] = useState(false)

  const { buyWalletBalance, holdWalletPreHold, holdWalletPostHold, updateBuyWallet, updateHoldWallet } = useWallet()

  const currentSharePrice = calculateSharePrice()
  const currentUserId = "current-user" // Mock current user ID

  // Filter orders for current user
  const userSellOrders = sellOrders.filter((order) => order.userId === currentUserId)
  const userBuyOrders = buyOrders.filter((order) => order.userId === currentUserId)

  const placeBuyOrder = useCallback(
    async (amount: number): Promise<{ success: boolean; message: string }> => {
      setLoading(true)

      try {
        // Validate amount
        if (amount <= 0) {
          return { success: false, message: "Amount must be greater than 0" }
        }

        if (amount > buyWalletBalance) {
          return { success: false, message: "Insufficient funds in Buy Wallet" }
        }

        // Calculate shares that can be bought
        const sharesPossible = Math.floor(amount / currentSharePrice)
        const actualAmount = sharesPossible * currentSharePrice

        if (sharesPossible === 0) {
          return { success: false, message: `Minimum purchase is N$${currentSharePrice} (1 share)` }
        }

        // Create buy order
        const newBuyOrder: BuyOrder = {
          id: `buy-${Date.now()}`,
          userId: currentUserId,
          totalAmount: actualAmount,
          pricePerShare: currentSharePrice,
          status: "active",
          createdAt: new Date(),
          filledAmount: 0,
        }

        // Deduct from buy wallet
        await updateBuyWallet(actualAmount, "subtract")

        // Match against sell orders
        const { matches, updatedSellOrders } = matchBuyOrder(newBuyOrder, sellOrders)

        // Update sell orders
        setSellOrders(updatedSellOrders)

        // Calculate filled amount and shares
        let totalFilledAmount = 0
        let totalShares = 0

        matches.forEach((match) => {
          totalFilledAmount += match.totalAmount
          totalShares += match.shares
        })

        // Update buy order status
        const updatedBuyOrder: BuyOrder = {
          ...newBuyOrder,
          filledAmount: totalFilledAmount,
          status: totalFilledAmount >= actualAmount ? "filled" : "active",
        }

        // Add shares to pre-hold wallet
        if (totalShares > 0) {
          // In the mock, we'll simulate adding to pre-hold
          console.log(`Mock: Adding ${totalShares} shares to pre-hold wallet`)
        }

        // Add to buy orders
        setBuyOrders((prev) => [...prev, updatedBuyOrder])

        // Return unused funds to buy wallet if any
        const unusedAmount = actualAmount - totalFilledAmount
        if (unusedAmount > 0) {
          await updateBuyWallet(unusedAmount, "add")
        }

        return {
          success: true,
          message: `Buy order placed! Purchased ${totalShares} shares for N$${totalFilledAmount.toFixed(2)}`,
        }
      } catch (error) {
        console.error("Error placing buy order:", error)
        return { success: false, message: "Failed to place buy order" }
      } finally {
        setLoading(false)
      }
    },
    [buyWalletBalance, currentSharePrice, updateBuyWallet, sellOrders],
  )

  const placeSellOrder = useCallback(
    async (shares: number): Promise<{ success: boolean; message: string }> => {
      setLoading(true)

      try {
        // Validate shares
        if (shares <= 0) {
          return { success: false, message: "Shares must be greater than 0" }
        }

        if (shares > holdWalletPostHold) {
          return { success: false, message: "Insufficient shares in Post-Hold wallet" }
        }

        // Create sell order
        const newSellOrder: SellOrder = {
          id: `sell-${Date.now()}`,
          userId: currentUserId,
          shares: shares,
          pricePerShare: currentSharePrice,
          status: "queued", // Start as queued, will become active based on queue position
          createdAt: new Date(),
          filledShares: 0,
        }

        // Deduct shares from post-hold wallet (mock)
        console.log(`Mock: Deducting ${shares} shares from post-hold wallet`)

        // Add to sell orders
        setSellOrders((prev) => [...prev, newSellOrder])

        return {
          success: true,
          message: `Sell order placed! Listed ${shares} shares at N$${currentSharePrice} each`,
        }
      } catch (error) {
        console.error("Error placing sell order:", error)
        return { success: false, message: "Failed to place sell order" }
      } finally {
        setLoading(false)
      }
    },
    [holdWalletPostHold, currentSharePrice],
  )

  const value: ExchangeContextType = {
    sellOrders,
    buyOrders,
    userSellOrders,
    userBuyOrders,
    placeBuyOrder,
    placeSellOrder,
    currentSharePrice,
    loading,
  }

  return <ExchangeContext.Provider value={value}>{children}</ExchangeContext.Provider>
}

export function useExchange() {
  const context = useContext(ExchangeContext)
  if (context === undefined) {
    throw new Error("useExchange must be used within an ExchangeProvider")
  }
  return context
}
