/**
 * Create Auth Delay - Rate Limit Protection for Supabase Auth
 * Pattern extracted from scripts-web MVP (proven in production)
 *
 * PURPOSE: Prevent Supabase auth rate limiting during tests
 * CRITICAL: scripts-web uses 500-750ms delay to avoid "Too many requests" errors
 *
 * @example
 * ```typescript
 * // Create delay function with 500ms minimum interval
 * const authDelay = createAuthDelay(500)
 *
 * // Use in test setup
 * await authDelay() // First call immediate
 * await signInAsUser(client, email, password)
 *
 * await authDelay() // Second call waits 500ms
 * await signInAsUser(client, email2, password2)
 * ```
 */

/**
 * Create auth delay function with configurable minimum interval
 *
 * Prevents rapid successive auth operations that trigger Supabase rate limits
 * Tracks last auth time and ensures minimum delay between operations
 *
 * @param minDelayMs - Minimum milliseconds between auth operations (default: 500ms)
 * @returns Async function that enforces delay
 */
export function createAuthDelay(minDelayMs: number = 500): () => Promise<void> {
  let lastAuthTime = 0

  return async function authDelay(): Promise<void> {
    const now = Date.now()
    const timeSinceLastAuth = now - lastAuthTime

    if (timeSinceLastAuth < minDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, minDelayMs - timeSinceLastAuth))
    }

    lastAuthTime = Date.now()
  }
}
