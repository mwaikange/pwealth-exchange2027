"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Lock,
  Gift,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting } from "@/contexts/vesting-context"

// Safe number conversion with fallback
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Safe toFixed with fallback
const safeToFixed = (value: any, decimals = 2): string => {
  const num = safeNumber(value)
  return num.toFixed(decimals)
}

// Safe percentage calculation
const safePercentage = (value: any, total: any): number => {
  const numValue = safeNumber(value)
  const numTotal = safeNumber(total)
  if (numTotal === 0) return 0
  return Math.min(Math.max((numValue / numTotal) * 100, 0), 100)
}

export function OverviewComponent() {
  const { user } = useAuth()
  const { walletBalances, loading: walletLoading } = useWallet()
  const { getAllVestingSlots, loading: vestingLoading } = useVesting()

  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    availableShares: 0,
    lockedShares: 0,
    claimableShares: 0,
    totalEarnings: 0,
    monthlyGrowth: 0,
  })

  // Calculate portfolio statistics
  useEffect(() => {
    if (!walletBalances) return

    const vestingSlots = getAllVestingSlots()

    // Safe extraction of wallet data
    const availableShares = safeNumber(walletBalances.shares)
    const cashBalance = safeNumber(walletBalances.cash)

    // Calculate vesting statistics
    const lockedShares = vestingSlots
      .filter((slot) => slot.status === "locked")
      .reduce((sum, slot) => sum + safeNumber(slot.amount), 0)

    const claimableShares = vestingSlots
      .filter((slot) => slot.status === "claim")
      .reduce((sum, slot) => sum + safeNumber(slot.amount), 0)

    // Estimate total value (assuming $1 per share for demo)
    const totalShares = availableShares + lockedShares + claimableShares
    const totalValue = totalShares + cashBalance

    // Calculate estimated earnings from vesting multipliers
    const totalEarnings = vestingSlots
      .filter((slot) => slot.status === "claim" || slot.status === "claimed")
      .reduce((sum, slot) => {
        const originalAmount = safeNumber(slot.amount)
        const multiplier = getVestingMultiplier(safeNumber(slot.level))
        return sum + (originalAmount * multiplier - originalAmount)
      }, 0)

    // Mock monthly growth (in real app, this would come from historical data)
    const monthlyGrowth = 12.5

    setPortfolioData({
      totalValue,
      availableShares,
      lockedShares,
      claimableShares,
      totalEarnings,
      monthlyGrowth,
    })
  }, [walletBalances, getAllVestingSlots])

  // Get vesting multiplier for level
  const getVestingMultiplier = (level: number): number => {
    const multipliers: Record<number, number> = {
      1: 1.1,
      2: 1.25,
      3: 1.5,
      4: 2.0,
      5: 3.0,
    }
    return multipliers[level] || 1.0
  }

  // Get level info
  const getLevelInfo = (level: number) => {
    const levelMap: Record<number, { name: string; color: string; icon: any }> = {
      1: { name: "Bronze", color: "text-amber-600", icon: Gift },
      2: { name: "Silver", color: "text-gray-600", icon: TrendingUp },
      3: { name: "Gold", color: "text-yellow-600", icon: CheckCircle },
      4: { name: "Platinum", color: "text-purple-600", icon: Lock },
      5: { name: "Diamond", color: "text-blue-600", icon: Calendar },
    }
    return levelMap[level] || { name: "Unknown", color: "text-gray-500", icon: Clock }
  }

  if (walletLoading || vestingLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const vestingSlots = getAllVestingSlots()

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Portfolio Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${safeToFixed(portfolioData.totalValue, 2)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />+{safeToFixed(portfolioData.monthlyGrowth, 1)}% this month
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Available Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Shares</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeToFixed(portfolioData.availableShares, 4)}</div>
            <p className="text-xs text-muted-foreground">Ready for trading or vesting</p>
          </CardContent>
        </Card>

        {/* Locked Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Shares</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeToFixed(portfolioData.lockedShares, 4)}</div>
            <p className="text-xs text-muted-foreground">Currently vesting</p>
          </CardContent>
        </Card>

        {/* Claimable Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimable Shares</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{safeToFixed(portfolioData.claimableShares, 4)}</div>
            <p className="text-xs text-muted-foreground">Ready to claim</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio Breakdown</TabsTrigger>
          <TabsTrigger value="vesting">Vesting Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Portfolio Breakdown */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Asset Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Available Shares</span>
                    <span className="font-medium">{safeToFixed(portfolioData.availableShares, 2)}</span>
                  </div>
                  <Progress
                    value={safePercentage(portfolioData.availableShares, portfolioData.totalValue)}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Locked Shares</span>
                    <span className="font-medium">{safeToFixed(portfolioData.lockedShares, 2)}</span>
                  </div>
                  <Progress
                    value={safePercentage(portfolioData.lockedShares, portfolioData.totalValue)}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Claimable Shares</span>
                    <span className="font-medium text-green-600">{safeToFixed(portfolioData.claimableShares, 2)}</span>
                  </div>
                  <Progress
                    value={safePercentage(portfolioData.claimableShares, portfolioData.totalValue)}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cash Balance</span>
                    <span className="font-medium">${safeToFixed(walletBalances?.cash, 2)}</span>
                  </div>
                  <Progress value={safePercentage(walletBalances?.cash, portfolioData.totalValue)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vestingSlots.slice(0, 5).map((slot, index) => {
                    const levelInfo = getLevelInfo(safeNumber(slot.level))
                    const IconComponent = levelInfo.icon

                    return (
                      <div key={slot.id || index} className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full bg-gray-100`}>
                          <IconComponent className={`h-4 w-4 ${levelInfo.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Level {safeNumber(slot.level)} - {levelInfo.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {safeToFixed(slot.amount, 4)} shares • {slot.status}
                          </p>
                        </div>
                        <Badge variant={slot.status === "claim" ? "default" : "secondary"}>{slot.status}</Badge>
                      </div>
                    )
                  })}

                  {vestingSlots.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No vesting activity yet</p>
                      <p className="text-xs">Start vesting to see your activity here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vesting Overview */}
        <TabsContent value="vesting" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vesting Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Vesting Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Slots</span>
                  <span className="font-bold">{vestingSlots.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Vesting</span>
                  <span className="font-bold text-yellow-600">
                    {vestingSlots.filter((s) => s.status === "locked").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ready to Claim</span>
                  <span className="font-bold text-green-600">
                    {vestingSlots.filter((s) => s.status === "claim").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Earnings</span>
                  <span className="font-bold text-blue-600">{safeToFixed(portfolioData.totalEarnings, 4)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Level Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Vesting by Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const levelSlots = vestingSlots.filter((s) => safeNumber(s.level) === level)
                    const levelInfo = getLevelInfo(level)
                    const IconComponent = levelInfo.icon
                    const totalAmount = levelSlots.reduce((sum, slot) => sum + safeNumber(slot.amount), 0)

                    return (
                      <div key={level} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <IconComponent className={`h-5 w-5 ${levelInfo.color}`} />
                          <span className="font-medium">
                            Level {level} - {levelInfo.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{safeToFixed(totalAmount, 4)}</div>
                          <div className="text-xs text-gray-500">{levelSlots.length} slots</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Earnings Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Total Earnings</span>
                  <span className="font-bold text-green-600">
                    +{safeToFixed(portfolioData.totalEarnings, 4)} shares
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Monthly Growth</span>
                  <span className="font-bold text-blue-600">+{safeToFixed(portfolioData.monthlyGrowth, 1)}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Portfolio Value</span>
                  <span className="font-bold text-purple-600">${safeToFixed(portfolioData.totalValue, 2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Portfolio Utilization</span>
                    <span>
                      {safeToFixed(
                        safePercentage(
                          portfolioData.lockedShares + portfolioData.claimableShares,
                          portfolioData.totalValue,
                        ),
                        1,
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={safePercentage(
                      portfolioData.lockedShares + portfolioData.claimableShares,
                      portfolioData.totalValue,
                    )}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Vesting Efficiency</span>
                    <span>85.2%</span>
                  </div>
                  <Progress value={85.2} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Claim Rate</span>
                    <span>92.7%</span>
                  </div>
                  <Progress value={92.7} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
