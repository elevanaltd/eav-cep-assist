import { describe, it, expect } from 'vitest'
import * as clientModule from './index.js'

/**
 * Test suite for client module exports
 *
 * Validates that all client creation utilities are properly exported
 */
describe('client module exports', () => {
  it('exports createBrowserClient for direct client creation', () => {
    expect(clientModule.createBrowserClient).toBeDefined()
    expect(typeof clientModule.createBrowserClient).toBe('function')
  })

  it('exports getSupabaseClient singleton (prevents multiple GoTrueClient)', () => {
    expect(clientModule.getSupabaseClient).toBeDefined()
    expect(typeof clientModule.getSupabaseClient).toBe('function')
  })
})
