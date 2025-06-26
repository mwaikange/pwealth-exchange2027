"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, TrendingUp, Shield, Coins } from "lucide-react"
import { supabase } from "@/lib/supabase-singleton"

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasSupabase, setHasSupabase] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          console.log("⚠️ Supabase not configured - showing demo mode")
          setHasSupabase(false)
          setIsLoading(false)
          return
        }

        setHasSupabase(true)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("✅ User already logged in, redirecting to dashboard")
          router.replace("/dashboard")
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error("❌ Error checking auth:", error)
        setHasSupabase(false)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p>Loading Peer Wealth Token...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Peer Wealth Token</h1>
              <p className="text-xs text-slate-400">Referral Investment Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!hasSupabase && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                Demo Mode
              </Badge>
            )}
            <Link href="/login">
              <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Build Wealth Through
            <span className="text-yellow-400 block">Peer Referrals</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join our referral-based investment platform where your network becomes your net worth. Earn rewards, build
            wealth, and grow together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/register">
              <Button size="lg" className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 px-8 py-4 text-lg">
                Start Earning Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-white border-slate-600 hover:bg-slate-800 px-8 py-4 text-lg"
              >
                Sign In to Dashboard
              </Button>
            </Link>
          </div>

          {!hasSupabase && (
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 mb-8">
              <p className="text-yellow-400 text-sm">
                <Shield className="inline w-4 h-4 mr-2" />
                Demo Mode: Database not connected. You can explore the interface, but data won't persist.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <Users className="w-12 h-12 text-yellow-400 mb-4" />
              <CardTitle className="text-white">Referral Network</CardTitle>
              <CardDescription className="text-slate-400">
                Build your network and earn from every successful referral
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-slate-300 space-y-2">
                <li>• Multi-level referral system</li>
                <li>• Real-time tracking</li>
                <li>• Instant rewards</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-yellow-400 mb-4" />
              <CardTitle className="text-white">Investment Growth</CardTitle>
              <CardDescription className="text-slate-400">
                Watch your investments grow through our peer-to-peer system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-slate-300 space-y-2">
                <li>• Vesting schedules</li>
                <li>• Progressive rewards</li>
                <li>• Compound growth</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <Shield className="w-12 h-12 text-yellow-400 mb-4" />
              <CardTitle className="text-white">Secure Platform</CardTitle>
              <CardDescription className="text-slate-400">
                Built with enterprise-grade security and transparency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-slate-300 space-y-2">
                <li>• Encrypted transactions</li>
                <li>• Transparent tracking</li>
                <li>• Secure authentication</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Building Wealth?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of users already earning through our referral platform
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 px-12 py-4 text-lg">
              Create Your Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-slate-400">© 2024 Peer Wealth Token. Built with v0.dev</p>
        </div>
      </footer>
    </div>
  )
}
