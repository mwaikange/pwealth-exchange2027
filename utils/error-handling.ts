// Track error attempts across the session
let networkErrorAttempts = 0

// Friendly error messages based on attempt count
const friendlyNetworkErrorMessages = [
  "It's our fault not yours", // 1st attempt
  "Try again in 2 min", // 2nd attempt
  "Haibo, Check your Data!", // 3rd attempt
  "Are you sure it's your Account?", // 4th attempt
  "Let's try again after an hour?", // 5th attempt
]

/**
 * Get a user-friendly error message for network errors
 * @param error The error object
 * @returns A user-friendly error message
 */
export function getFriendlyErrorMessage(error: unknown): string {
  // Check if it's a network error
  if (
    error instanceof Error &&
    (error.message.includes("failed to fetch") ||
      error.message.includes("network") ||
      error.message.includes("NetworkError"))
  ) {
    // Increment the attempt counter
    networkErrorAttempts = (networkErrorAttempts + 1) % friendlyNetworkErrorMessages.length

    // Return the appropriate message based on attempt count
    return friendlyNetworkErrorMessages[networkErrorAttempts]
  }

  // For non-network errors, return a generic message or the original error
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

/**
 * Reset the network error attempt counter
 */
export function resetNetworkErrorAttempts(): void {
  networkErrorAttempts = 0
}
