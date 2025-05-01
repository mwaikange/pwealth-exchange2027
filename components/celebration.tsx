"use client"

import { useEffect, useState, useRef } from "react"
import confetti from "canvas-confetti"
import { Howl } from "howler"

type CelebrationProps = {
  onComplete: () => void
}

export default function Celebration({ onComplete }: CelebrationProps) {
  const [isActive, setIsActive] = useState(true)
  const soundRef = useRef<Howl | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize sound
    soundRef.current = new Howl({
      src: ["/sounds/celebration.mp3"], // Make sure to add this sound file to your public folder
      volume: 0.7,
      autoplay: true,
      loop: false,
    })

    // Play sound
    soundRef.current.play()

    // Initial confetti burst
    triggerConfetti()

    // Set up interval for repeated effects
    intervalRef.current = setInterval(() => {
      triggerConfetti()
    }, 1000)

    // Cleanup after 5 seconds (changed from 10 seconds)
    const timeout = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (soundRef.current) {
        soundRef.current.fade(0.7, 0, 1000)
      }
      setIsActive(false)
      onComplete()
    }, 5000) // Changed to 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (timeout) {
        clearTimeout(timeout)
      }
      if (soundRef.current) {
        soundRef.current.stop()
      }
    }
  }, [onComplete])

  const triggerConfetti = () => {
    // Center burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6, x: 0.5 },
    })

    // Left side burst
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      })
    }, 250)

    // Right side burst
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      })
    }, 400)
  }

  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>

      {/* Falling coins animation */}
      <div className="relative w-full h-full overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-50px`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            <div className="text-4xl">💰</div>
          </div>
        ))}
      </div>
    </div>
  )
}
