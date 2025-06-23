"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { ethers } from "ethers"

import { getExchangeContract, getERC20Contract } from "../utils/ethers"
import { useWallet } from "./wallet-context"

interface Order {
  id: number
  token: string
  amount: number
  price: number
  creator: string
  filled: boolean
}

interface ExchangeContextType {
  sellOrders: Order[]
  buyOrders: Order[]
  loading: boolean
  error: string | null
  placeSellOrder: (token: string, amount: number, price: number) => Promise<void>
  placeBuyOrder: (token: string, amount: number, price: number) => Promise<void>
  fillOrder: (orderId: number, isSellOrder: boolean) => Promise<void>
  refreshExchangeData: () => Promise<void>
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export const useExchange = () => {
  const context = useContext(ExchangeContext)
  if (!context) {
    throw new Error("useExchange must be used within an ExchangeProvider")
  }
  return context
}

interface ExchangeProviderProps {
  children: React.ReactNode
}

export const ExchangeProvider: React.FC<ExchangeProviderProps> = ({ children }) => {
  const [sellOrders, setSellOrders] = useState<Order[]>([])
  const [buyOrders, setBuyOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { account, provider, refreshWalletData } = useWallet()

  const refreshExchangeData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!provider) {
        console.warn("Provider not available. Cannot refresh exchange data.")
        return
      }

      const exchangeContract = getExchangeContract(provider)

      const sellOrderCount = (await exchangeContract.sellOrderCount()).toNumber()
      const buyOrderCount = (await exchangeContract.buyOrderCount()).toNumber()

      const fetchOrders = async (count: number, isSellOrder: boolean): Promise<Order[]> => {
        const orders: Order[] = []
        for (let i = 1; i <= count; i++) {
          try {
            const order = await exchangeContract.getOrder(i, isSellOrder)
            if (order) {
              orders.push({
                id: i,
                token: order.token,
                amount: order.amount.toNumber(),
                price: order.price.toNumber(),
                creator: order.creator,
                filled: order.filled,
              })
            }
          } catch (fetchError) {
            console.error(`Error fetching order ${i}:`, fetchError)
          }
        }
        return orders
      }

      const [sellOrders, buyOrders] = await Promise.all([
        fetchOrders(sellOrderCount, true),
        fetchOrders(buyOrderCount, false),
      ])

      setSellOrders(sellOrders)
      setBuyOrders(buyOrders)
      console.log("Orders refreshed:", { sellOrders: sellOrders.length, buyOrders: buyOrders.length })
    } catch (error) {
      console.error("Error refreshing exchange data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const placeSellOrder = async (token: string, amount: number, price: number) => {
    try {
      setLoading(true)
      setError(null)

      if (!provider || !account) {
        throw new Error("Provider or account not available.")
      }

      const signer = provider.getSigner()
      const exchangeContract = getExchangeContract(signer)
      const tokenContract = getERC20Contract(token, signer)

      // Approve the exchange contract to spend the user's tokens
      const approveTx = await tokenContract.approve(exchangeContract.address, ethers.constants.MaxUint256)
      await approveTx.wait()

      // Place the sell order
      const tx = await exchangeContract.placeSellOrder(token, amount, price)
      const result = await tx.wait()

      if (result.success) {
        // Refresh both wallet and exchange data
        await Promise.all([refreshWalletData(), refreshExchangeData()])
      }
    } catch (error) {
      console.error("Error placing sell order:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const placeBuyOrder = async (token: string, amount: number, price: number) => {
    try {
      setLoading(true)
      setError(null)

      if (!provider || !account) {
        throw new Error("Provider or account not available.")
      }

      const signer = provider.getSigner()
      const exchangeContract = getExchangeContract(signer)

      // Place the buy order
      const tx = await exchangeContract.placeBuyOrder(token, amount, price, {
        value: ethers.utils.parseEther((amount * price).toString()),
      })
      await tx.wait()

      // Refresh both wallet and exchange data
      await Promise.all([refreshWalletData(), refreshExchangeData()])
    } catch (error) {
      console.error("Error placing buy order:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fillOrder = async (orderId: number, isSellOrder: boolean) => {
    try {
      setLoading(true)
      setError(null)

      if (!provider || !account) {
        throw new Error("Provider or account not available.")
      }

      const signer = provider.getSigner()
      const exchangeContract = getExchangeContract(signer)

      // Fill the order
      const tx = await exchangeContract.fillOrder(orderId, isSellOrder)
      await tx.wait()

      // Refresh both wallet and exchange data
      await Promise.all([refreshWalletData(), refreshExchangeData()])
    } catch (error) {
      console.error("Error filling order:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (provider) {
      refreshExchangeData()
    }
  }, [provider])

  const value: ExchangeContextType = {
    sellOrders,
    buyOrders,
    loading,
    error,
    placeSellOrder,
    placeBuyOrder,
    fillOrder,
    refreshExchangeData,
  }

  return <ExchangeContext.Provider value={value}>{children}</ExchangeContext.Provider>
}
