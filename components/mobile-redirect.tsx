"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"

export function MobileRedirect() {
  const router = useRouter()
  const isMobile = useMobile()

  useEffect(() => {
    if (isMobile) {
      router.push("/mobile/home")
    }
  }, [isMobile, router])

  return null
}
