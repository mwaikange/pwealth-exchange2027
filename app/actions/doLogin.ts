"use server"

import { supabase } from "@/lib/supabase"

export async function doLogin(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Login error:", error.message)
      return { success: false, message: error.message }
    }

    if (!data.user) {
      return { success: false, message: "Invalid credentials" }
    }

    return { success: true, user: data.user }
  } catch (error: any) {
    console.error("Unexpected login error:", error.message)
    return { success: false, message: error.message || "An unexpected error occurred" }
  }
}
