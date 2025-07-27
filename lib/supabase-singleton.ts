// This file exists for backward compatibility
// All new code should import from @/lib/supabase instead

import { supabase as supabaseClient } from "./supabase"

export const supabase = supabaseClient
export default supabaseClient
