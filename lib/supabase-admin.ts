/**
 * Admin Supabase Client
 * For administrative operations requiring service role permissions
 */

import { createClient } from "@supabase/supabase-js"
import { clientEnv, serverEnv } from "./env"
import type { Database } from "@/types/supabase"

// Validate admin configuration
if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required for admin operations")
}

/**
 * Admin Supabase client with service role permissions
 * Use with caution - has full database access
 */
export const supabaseAdmin = createClient<Database>(
  clientEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "X-Client-Info": "peer-wealth-admin@1.0.0",
      },
    },
  },
)

export const createAdminClient = () => supabaseAdmin

/**
 * Admin operations helper functions
 */
export const adminOperations = {
  /**
   * Get user by email (admin only)
   */
  async getUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (error) throw error
    return data
  },

  /**
   * Create user (admin only)
   */
  async createUser(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata,
    })
    if (error) throw error
    return data
  },

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
  },
}

export default supabaseAdmin
