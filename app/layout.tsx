import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { PriceProvider } from "@/contexts/price-context"
import { AuthProvider } from "@/contexts/auth-context"
import { WalletProvider } from "@/contexts/wallet-context"
import { VestingProvider } from "@/contexts/vesting-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { ExchangeProvider } from "@/contexts/exchange-context"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Peer Wealth Token - Referral Investment Platform",
  description: "Join the peer-to-peer wealth building community with referral rewards and investment opportunities",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <WalletProvider>
            <PriceProvider>
              <VestingProvider>
                <TransactionProvider>
                  <ExchangeProvider>
                    {children}
                    <Toaster />
                  </ExchangeProvider>
                </TransactionProvider>
              </VestingProvider>
            </PriceProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
