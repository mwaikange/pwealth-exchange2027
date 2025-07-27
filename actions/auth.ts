"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function login(formData: FormData) {
  const supabase = createServerSupabaseClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    throw new Error("Email and password are required")
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Login error:", error)
      throw error
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error) {
    console.error("Login failed:", error)
    throw error
  }
}

export async function signup(formData: FormData) {
  const supabase = createServerSupabaseClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("full_name") as string

  if (!email || !password || !fullName) {
    throw new Error("All fields are required")
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      console.error("Signup error:", error)
      throw error
    }

    revalidatePath("/", "layout")
    redirect("/verify-email")
  } catch (error) {
    console.error("Signup failed:", error)
    throw error
  }
}

export async function resetPassword(formData: FormData) {
  const supabase = createServerSupabaseClient()

  const email = formData.get("email") as string

  if (!email) {
    throw new Error("Email is required")
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    })

    if (error) {
      console.error("Reset password error:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Reset password failed:", error)
    throw error
  }
}
