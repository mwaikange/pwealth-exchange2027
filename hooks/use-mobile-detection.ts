"use client"

import { useState, useEffect } from "react"

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== "undefined") {
      // Function to check if device is mobile
      const checkMobile = () => {
        const userAgent = navigator.userAgent.toLowerCase()
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
        const isMobileDevice = mobileRegex.test(userAgent)
        const isMobileSize = window.innerWidth < 768

        setIsMobile(isMobileDevice || isMobileSize)
      }

      // Initial check
      checkMobile()

      // Add resize listener for responsive layout changes
      window.addEventListener("resize", checkMobile)

      // Cleanup
      return () => window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return isMobile
}
