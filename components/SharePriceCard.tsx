"use client"

import { getCurrentShareMetrics, formatNAD } from "@/lib/price-calculations"
import { Clock, TrendingUp, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SharePriceCard() {
  const metrics = getCurrentShareMetrics()

  return (
    <div className="space-y-4">
      {/* Main Price Display */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">SHARE PRICE</h1>
        <div className="text-5xl font-bold text-black dark:text-white mb-2">{formatNAD(metrics.currentPrice)}</div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <TrendingUp className="w-3 h-3 mr-1" />
            Pegged Weekly
          </Badge>
        </div>
      </div>

      {/* Price Update Schedule */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Next Price Update</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">{metrics.nextUpdateDate}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Price updates every Monday at 9:00 AM</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HODL Metrics */}
      <Card className="bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
            <div className="space-y-2">
              <div className="font-medium text-slate-900 dark:text-slate-100">Market Metrics</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-600 dark:text-slate-400">HODL Rate</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {metrics.hodlPercentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-400">In Circulation</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {metrics.inCirculation.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total Supply: {metrics.totalSupply.toLocaleString()} shares
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
