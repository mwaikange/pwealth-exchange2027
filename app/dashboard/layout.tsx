"use client"
import type { ReactNode } from "react"
import { MobileDetectionProvider } from "../../contexts/mobile-detection-context"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <MobileDetectionProvider>{children}</MobileDetectionProvider>
}
