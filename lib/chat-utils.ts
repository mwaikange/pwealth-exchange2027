import { createServerSupabaseClient } from "@/lib/supabase-server"

// Constants
export const DAILY_QUESTION_LIMIT = 15
export const CACHE_EXPIRY_DAYS = 30 // How long to keep cached responses

// Normalize a question for better cache matching
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, "") // Remove punctuation
}

// Create a hash for the question to use as a cache key
export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString()
}

// Check if a question is simple enough for GPT-3.5
export function isSimpleQuestion(question: string): boolean {
  const simplePatterns = [
    "what is my balance",
    "how much",
    "show me",
    "when did",
    "where can i find",
    "how do i",
    "what does",
    "who is",
    "can you explain",
    "tell me about",
    "help me understand",
  ]

  const normalizedQuestion = question.toLowerCase().trim()

  // Check if the question matches any simple patterns
  return simplePatterns.some((pattern) => normalizedQuestion.includes(pattern))
}

// Determine which model to use based on question complexity
export function determineModelForQuestion(question: string): string {
  if (isSimpleQuestion(question)) {
    return "gpt-3.5-turbo" // Cheaper model for simple questions
  }
  return "gpt-4o" // More expensive but better for complex questions
}

// Check if user has reached their daily question limit
export async function hasReachedDailyLimit(userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    const { data, error, count } = await supabase
      .from("chat_usage")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("date", today)

    if (error) {
      console.error("Error checking daily limit:", error)
      return false // Default to allowing questions if there's an error
    }

    return (count || 0) >= DAILY_QUESTION_LIMIT
  } catch (error) {
    console.error("Error in hasReachedDailyLimit:", error)
    return false
  }
}

// Track a new question for the user
export async function trackQuestion(
  userId: string,
  question: string,
  model: string,
  tokensUsed: number,
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    await supabase.from("chat_usage").insert({
      user_id: userId,
      date: today,
      question: question,
      model: model,
      tokens_used: tokensUsed,
    })
  } catch (error) {
    console.error("Error tracking question:", error)
  }
}

// Get a cached response if available
export async function getCachedResponse(question: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    const normalizedQuestion = normalizeQuestion(question)
    const questionHash = hashString(normalizedQuestion)

    const { data, error } = await supabase
      .from("chat_cache")
      .select("response, created_at")
      .eq("question_hash", questionHash)
      .single()

    if (error || !data) {
      return null
    }

    // Check if cache is expired
    const cacheDate = new Date(data.created_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > CACHE_EXPIRY_DAYS) {
      // Cache expired, delete it
      await supabase.from("chat_cache").delete().eq("question_hash", questionHash)
      return null
    }

    return data.response
  } catch (error) {
    console.error("Error getting cached response:", error)
    return null
  }
}

// Store a response in the cache
export async function cacheResponse(question: string, response: string): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    const normalizedQuestion = normalizeQuestion(question)
    const questionHash = hashString(normalizedQuestion)

    // Check if it already exists
    const { data, error } = await supabase.from("chat_cache").select("id").eq("question_hash", questionHash).single()

    if (data) {
      // Update existing cache
      await supabase
        .from("chat_cache")
        .update({
          response: response,
          created_at: new Date().toISOString(),
        })
        .eq("id", data.id)
    } else {
      // Insert new cache entry
      await supabase.from("chat_cache").insert({
        question: normalizedQuestion,
        question_hash: questionHash,
        response: response,
        created_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error caching response:", error)
  }
}
