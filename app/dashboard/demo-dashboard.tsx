"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, Users, Coins, Shield, Copy, ExternalLink, DollarSign, Activity, CreditCard } from "lucide-react"

export default function DemoDashboard() {
  const [copiedReferral, setCopiedReferral] = useState(false)

  const demoData = {
    user: {
      name: "Demo User",
      email: "demo@peerwealth.com",
      displayId: "DEMO123",
      referralCode: "DEMO-REF-123",
    },
    wallet: {
      totalBalance: 1250.75,
      availableBalance: 850.25,
      vestedBalance: 400.5,
      pendingRewards: 125.0,
    },
    referrals: {
      totalReferrals: 12,
      activeReferrals: 8,
      totalEarnings: 2450.0,
      thisMonth: 450.0,
    },
    vesting: {
      totalSchedules: 15,
      claimedSchedules: 5,
      nextClaimDate: "2024-02-15",
      nextClaimAmount: 150.0,
    },
  }

  const copyReferralLink = () => {
    const referralLink = `https://peerwealth.com/ref/${demoData.user.referralCode}`
    navigator.clipboard.writeText(referralLink)
    setCopiedReferral(true)
    setTimeout(() => setCopiedReferral(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Peer Wealth Token</h1>
              <p className="text-xs text-slate-400">Dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              <Shield className="w-3 h-3 mr-1" />
              Demo Mode
            </Badge>
            <div className="text-right">
              <p className="text-sm text-white">{demoData.user.name}</p>
              <p className="text-xs text-slate-400">{demoData.user.displayId}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Alert */}
        <Alert className="mb-8 border-blue-500 bg-blue-500/10">
          <Shield className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            <p className="font-medium">Demo Mode Active</p>
            <p className="text-sm">
              This is a demonstration of the Peer Wealth Token dashboard. All data shown is simulated.
            </p>
          </AlertDescription>
        </Alert>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${demoData.wallet.totalBalance.toFixed(2)}</div>
              <p className="text-xs text-slate-400">+12.5% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{demoData.referrals.totalReferrals}</div>
              <p className="text-xs text-slate-400">{demoData.referrals.activeReferrals} active this month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Referral Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${demoData.referrals.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-slate-400">${demoData.referrals.thisMonth.toFixed(2)} this month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Vesting Progress</CardTitle>
              <Activity className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {demoData.vesting.claimedSchedules}/{demoData.vesting.totalSchedules}
              </div>
              <p className="text-xs text-slate-400">Next claim: ${demoData.vesting.nextClaimAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-yellow-400" />
                Referral Program
              </CardTitle>
              <CardDescription className="text-slate-400">Share your referral link and earn rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Your Referral Code</p>
                <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded border">
                  <code className="text-yellow-400 font-mono">{demoData.user.referralCode}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyReferralLink}
                    className="text-white border-slate-600 hover:bg-slate-700"
                  >
                    {copiedReferral ? "Copied!" : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{demoData.referrals.totalReferrals}</p>
                  <p className="text-sm text-slate-400">Total Referrals</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">${demoData.referrals.totalEarnings.toFixed(2)}</p>
                  <p className="text-sm text-slate-400">Total Earned</p>
                </div>
              </div>

              <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900">
                <ExternalLink className="w-4 h-4 mr-2" />
                Share Referral Link
              </Button>
            </CardContent>
          </Card>

          {/* Wallet Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-yellow-400" />
                Wallet Overview
              </CardTitle>
              <CardDescription className="text-slate-400">Your current balance and rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Available Balance</span>
                  <span className="text-white font-semibold">${demoData.wallet.availableBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Vested Balance</span>
                  <span className="text-white font-semibold">${demoData.wallet.vestedBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pending Rewards</span>
                  <span className="text-yellow-400 font-semibold">${demoData.wallet.pendingRewards.toFixed(2)}</span>
                </div>
                <hr className="border-slate-600" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Balance</span>
                  <span className="text-xl font-bold text-yellow-400">${demoData.wallet.totalBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-700">
                  Deposit
                </Button>
                <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-700">
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-slate-400">Common tasks and features (Demo Mode)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="text-white border-slate-600 hover:bg-slate-700 h-auto py-4 flex-col"
                >
                  <Users className="w-6 h-6 mb-2 text-yellow-400" />
                  <span>View Referrals</span>
                </Button>
                <Button
                  variant="outline"
                  className="text-white border-slate-600 hover:bg-slate-700 h-auto py-4 flex-col"
                >
                  <Activity className="w-6 h-6 mb-2 text-yellow-400" />
                  <span>Vesting Schedule</span>
                </Button>
                <Button
                  variant="outline"
                  className="text-white border-slate-600 hover:bg-slate-700 h-auto py-4 flex-col"
                >
                  <TrendingUp className="w-6 h-6 mb-2 text-yellow-400" />
                  <span>Exchange</span>
                </Button>
                <Button
                  variant="outline"
                  className="text-white border-slate-600 hover:bg-slate-700 h-auto py-4 flex-col"
                >
                  <CreditCard className="w-6 h-6 mb-2 text-yellow-400" />
                  <span>Transactions</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
