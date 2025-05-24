"use client"

import dynamic from "next/dynamic"

const MobileVestingContent = dynamic(() => import("@/components/mobile/mobile-vesting-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <div>Loading Vesting...</div>
      </div>
    </div>
  ),
})

export default function MobileVestingPage() {
  return <MobileVestingContent />
}
