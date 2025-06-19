import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { WalletProvider } from "@/contexts/wallet-context"
import { VestingProvider } from "@/contexts/vesting-context"
import { ExchangeProvider } from "@/contexts/exchange-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Peer Wealth Token",
  description: "Share trading platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <WalletProvider>
              <VestingProvider>
                <ExchangeProvider>
                  <TransactionProvider>{children}</TransactionProvider>
                </ExchangeProvider>
              </VestingProvider>
            </WalletProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
