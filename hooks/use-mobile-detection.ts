"use client"

import { useState, useEffect } from "react"

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      // Function to check if device is mobile
      const checkMobile = () => {
        const userAgent = navigator.userAgent.toLowerCase()
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i

        // Check if screen width is less than 768px (typical mobile breakpoint)
        const isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth < 768
        setIsMobile(isMobileDevice)
      }

      // Initial check
      checkMobile()

      // Add event listener for window resize
      window.addEventListener("resize", checkMobile)

      // Cleanup
      return () => window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return isMobile
}
