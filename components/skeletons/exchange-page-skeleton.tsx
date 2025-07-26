import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"

export function ExchangePageSkeleton() {
  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen animate-pulse">
      <Alert className="bg-slate-800/50 border-slate-700">
        <Skeleton className="h-5 w-full" />
      </Alert>

      <div className="grid grid-cols-4 gap-6">
        {/* Share Price Skeleton */}
        <div className="col-span-1">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2 mb-1" />
              <Skeleton className="h-3 w-1/4" />
            </CardContent>
          </Card>
        </div>

        {/* Wallet Cards Skeleton */}
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Order Books Skeleton */}
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <Skeleton className="h-6 w-3/5" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Orders Skeleton */}
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <Skeleton className="h-6 w-3/5" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <Skeleton key={j} className="h-20 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
