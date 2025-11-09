import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSupabaseClient, __resetSupabaseClient } from './singleton.js'
import * as browserModule from './browser.js'

/**
 * Test suite for Supabase client singleton pattern
 *
 * PURPOSE: Prevent multiple GoTrueClient instances in production
 * ISSUE: Each createBrowserClient() call creates separate auth instance
 * SOLUTION: Singleton ensures single shared instance across all modules
 */
describe('getSupabaseClient singleton', () => {
  beforeEach(() => {
    // Reset singleton state before each test
    __resetSupabaseClient()
    vi.clearAllMocks()

    // Mock environment variables
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
  })

  it('creates client on first call', () => {
    const createSpy = vi.spyOn(browserModule, 'createBrowserClient')

    const client = getSupabaseClient()

    expect(client).toBeDefined()
    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it('returns same instance on subsequent calls (prevents multiple GoTrueClient)', () => {
    const createSpy = vi.spyOn(browserModule, 'createBrowserClient')

    const client1 = getSupabaseClient()
    const client2 = getSupabaseClient()
    const client3 = getSupabaseClient()

    // CRITICAL: Only one createBrowserClient call (prevents warning)
    expect(createSpy).toHaveBeenCalledTimes(1)

    // Same instance returned each time
    expect(client1).toBe(client2)
    expect(client2).toBe(client3)
  })

  it('creates new instance after reset (test isolation)', () => {
    const createSpy = vi.spyOn(browserModule, 'createBrowserClient')

    const client1 = getSupabaseClient()
    __resetSupabaseClient()
    const client2 = getSupabaseClient()

    expect(createSpy).toHaveBeenCalledTimes(2)
    expect(client1).not.toBe(client2)
  })
})
