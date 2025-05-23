"use client"

import { DashboardContent } from "@/components/dashboard-content"
import { MobileRedirect } from "@/components/mobile-redirect"

export default function Dashboard() {
  return (
    <>
      <MobileRedirect />
      <DashboardContent />
    </>
  )
}
