import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    // Use the correct function and ensure URL and key are provided
    const supabase = createServerSupabaseClient()

    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return NextResponse.json([])
    }

    // Query specifically for active notifications
    const { data, error } = await supabase
      .from("notifications")
      .select("id, message, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json([]) // Return empty array instead of error
    }

    console.log(`Fetched ${data?.length || 0} active notifications`)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Unexpected error in notifications API:", error)
    return NextResponse.json([]) // Return empty array instead of error
  }
}
