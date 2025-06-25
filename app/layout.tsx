import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { PriceProvider } from "@/contexts/price-context"
import { AuthProvider } from "@/contexts/auth-context"
import { WalletProvider } from "@/contexts/wallet-context"
import { VestingProvider } from "@/contexts/vesting-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { ExchangeProvider } from "@/contexts/exchange-context"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WalletProvider>
            <PriceProvider>
              <VestingProvider>
                <TransactionProvider>
                  <ExchangeProvider>{children}</ExchangeProvider>
                </TransactionProvider>
              </VestingProvider>
            </PriceProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
