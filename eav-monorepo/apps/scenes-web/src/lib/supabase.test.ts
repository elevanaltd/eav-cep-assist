import { describe, it, expect } from 'vitest'
import { supabase } from './supabase'

/**
 * Test: Supabase client initialization
 *
 * North Star I6: App-specific state tables
 * Verifies that supabase client is initialized and can be used by the app
 */
describe('supabase client', () => {
  it('should initialize browser client from shared library', () => {
    expect(supabase).toBeDefined()
    expect(supabase).toHaveProperty('from')
    expect(typeof supabase.from).toBe('function')
  })

  it('should have auth property for session management', () => {
    expect(supabase).toHaveProperty('auth')
    expect(typeof supabase.auth).toBe('object')
  })

  it('should be able to reference database tables', () => {
    // North Star I6: App reads shared script_components, writes to app-specific state
    expect(supabase.from('script_components')).toBeDefined()
    expect(supabase.from('projects')).toBeDefined()
    expect(supabase.from('videos')).toBeDefined()
    expect(supabase.from('scripts')).toBeDefined()
  })
})
