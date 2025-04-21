"use client"

import type React from "react"

import { useRealtime } from "@/hooks/useRealtime"

export function RealtimeWrapper({ children }: { children: React.ReactNode }) {
  useRealtime()
  return <>{children}</>
}
