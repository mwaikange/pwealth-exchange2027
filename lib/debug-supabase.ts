// Debug function to check for multiple Supabase instances
export function checkSupabaseInstances() {
  if (typeof window !== "undefined") {
    console.log("Checking for multiple Supabase instances...")

    // Look for the warning in console logs
    const originalConsoleWarn = console.warn
    console.warn = (message) => {
      if (message && typeof message === "string" && message.includes("Multiple GoTrueClient instances")) {
        console.error("DETECTED: Multiple GoTrueClient instances warning!")
        console.trace("Stack trace for multiple instances:")
      }
      originalConsoleWarn.apply(console, arguments)
    }

    // Add this to a component that loads early
    console.log("Supabase instance monitoring enabled")
  }
}
