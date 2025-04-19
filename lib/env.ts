// Improve environment variable handling to prevent runtime errors

// Ensure all environment variables are properly defined with fallbacks
export const env = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_UR ||
    (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : ""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3dC1kZXYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxMzM2MjU2MCwiZXhwIjoyMDI4OTM4NTYwfQ.fallback-key-for-development",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KE ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3dC1kZXYiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzEzMzYyNTYwLCJleHAiOjIwMjg5Mzg1NjB9.fallback-service-key-for-development",
  SUPABASE_JWT_SECRET:
    process.env.SUPABASE_JWT_SECRET || "your-super-secret-jwt-token-with-at-least-32-characters-long",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== "undefined" ? window.location.origin : ""),

  // Database connection variables
  POSTGRES_URL: process.env.POSTGRES_URL || "",
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL || "",
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || "",
  POSTGRES_USER: process.env.POSTGRES_USER || "",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "",
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || "",
  POSTGRES_HOST: process.env.POSTGRES_HOST || "",
}

// Validate required environment variables
const requiredEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]

if (typeof window === "undefined") {
  // Only run on server
  for (const envVar of requiredEnvVars) {
    if (!env[envVar as keyof typeof env]) {
      console.warn(`Missing required environment variable: ${envVar}`)
    }
  }
}
