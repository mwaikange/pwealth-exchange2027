import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-green-500",
    "bg-blue-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-red-500",
    "border-green-500",
    "border-blue-500",
    "border-pink-500",
    "border-yellow-500",
    "border-red-500",
    "text-green-500",
    "text-blue-500",
    "text-pink-500",
    "text-yellow-500",
    "text-red-500",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        green: {
          500: "#34a853",
          600: "#2e8544",
        },
        blue: {
          500: "#4285f4",
          600: "#3367d6",
        },
        yellow: {
          500: "#fbbc05",
          600: "#f9a825",
        },
        purple: {
          500: "#a142f4",
          600: "#8e24aa",
        },
        gray: {
          600: "#4a4d5a",
          700: "#3a3d4a",
          800: "#2a2d3a",
          900: "#1c1e26",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "slide-message": {
          "0%": { transform: "translateX(100%)" },
          "15%": { transform: "translateX(0%)" },
          "85%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-message": "slide-message 40s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
