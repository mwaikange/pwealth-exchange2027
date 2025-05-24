"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamically import the component to avoid SSR issues
const MobileHomeContent = dynamic(() => import("@/components/mobile/mobile-home-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1c1e26] text-white flex items-center justify-center">
      <div>Loading...</div>
    </div>
  ),
})

export default function MobileHomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1c1e26] text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return <MobileHomeContent />
}
