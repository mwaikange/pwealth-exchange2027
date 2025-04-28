"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface MobileDetectionContextType {
  isMobile: boolean
}

const MobileDetectionContext = createContext<MobileDetectionContextType>({
  isMobile: false,
})

export const useMobileDetectionContext = () => useContext(MobileDetectionContext)

export function MobileDetectionProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }

      // Initial check
      checkMobile()

      // Add event listener for window resize
      window.addEventListener("resize", checkMobile)

      // Clean up
      return () => window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return <MobileDetectionContext.Provider value={{ isMobile }}>{children}</MobileDetectionContext.Provider>
}
