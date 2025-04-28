import { getFriendlyErrorMessage } from "@/utils/error-handling"

/**
 * Utility function to retry a fetch operation with exponential backoff
 * @param fetchFn The fetch function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in ms before first retry
 * @returns The result of the fetch function or throws an error after max retries
 */
export async function fetchWithRetry<T>(fetchFn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        // Convert to a friendly error message before throwing
        const friendlyMessage = getFriendlyErrorMessage(error)
        const friendlyError = new Error(friendlyMessage)
        friendlyError.cause = error // Preserve the original error as the cause
        throw friendlyError
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }

  // This should never be reached due to the throw in the loop
  throw lastError
}

/**
 * Check if the error is likely a network or temporary issue that can be retried
 * @param error The error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return true
  }

  // Server errors (5xx)
  if (error.status && error.status >= 500 && error.status < 600) {
    return true
  }

  // Rate limiting (429)
  if (error.status === 429) {
    return true
  }

  return false
}
