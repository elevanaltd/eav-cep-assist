/**
 * Test Infrastructure Smoke Test (Simplified)
 *
 * Purpose: Validate test infrastructure setup is working correctly
 * Scope: Tests only what exists NOW (before Week 2 extraction)
 *
 * Note: This test uses direct @supabase/supabase-js import since
 * @workspace/shared/client doesn't exist yet (Week 2 extraction pending)
 */

import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { TEST_USERS } from '../supabase-test-client'
import { authDelay } from '../auth-helpers'
import { mockProject, mockScript, resetFactoryIds } from '../factories'

// Direct Supabase client (bypassing shared package that doesn't exist yet)
const testClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)

describe('Test Infrastructure Smoke Test', () => {
  describe('1. Local Supabase Connection', () => {
    it('should connect to local Supabase', async () => {
      const { data, error } = await testClient.auth.getSession()

      // No error means connection works
      expect(error).toBeNull()
    })

    it('should use local URL (not production)', () => {
      // Verify we're not accidentally hitting production
      expect(testClient.supabaseUrl).toBe('http://127.0.0.1:54321')
    })
  })

  describe('2. Test Users Configuration', () => {
    it('should have admin test user defined', () => {
      expect(TEST_USERS.admin).toBeDefined()
      expect(TEST_USERS.admin.email).toBe('admin.test@example.com')
      expect(TEST_USERS.admin.password).toBeDefined()
    })

    it('should have client test user defined', () => {
      expect(TEST_USERS.client).toBeDefined()
      expect(TEST_USERS.client.email).toBe('client.test@example.com')
    })

    it('should have unauthorized test user defined', () => {
      expect(TEST_USERS.unauthorized).toBeDefined()
      expect(TEST_USERS.unauthorized.email).toBe('unauthorized.test@example.com')
    })
  })

  describe('3. Auth Operations', () => {
    it('should sign in as admin', async () => {
      const { data, error } = await testClient.auth.signInWithPassword({
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe(TEST_USERS.admin.email)

      await testClient.auth.signOut()
      await authDelay()
    })

    it('should sign in as client', async () => {
      const { data, error } = await testClient.auth.signInWithPassword({
        email: TEST_USERS.client.email,
        password: TEST_USERS.client.password,
      })

      expect(error).toBeNull()
      expect(data.user?.email).toBe(TEST_USERS.client.email)

      await testClient.auth.signOut()
      await authDelay()
    })

    it('should rate limit auth operations', async () => {
      const start = Date.now()
      await authDelay()
      const elapsed = Date.now() - start

      // Should delay at least 740ms (allowing 10ms variance for timing precision)
      expect(elapsed).toBeGreaterThanOrEqual(740)
    })
  })

  describe('4. User Profiles (RLS Critical)', () => {
    it('should have user_profile for admin', async () => {
      // Sign in as admin
      const { data: authData } = await testClient.auth.signInWithPassword({
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      })
      await authDelay()

      const { data, error } = await testClient
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.email).toBe('admin.test@example.com')
      expect(data?.role).toBe('admin')

      await testClient.auth.signOut()
      await authDelay()
    })

    it('should have user_profile for client', async () => {
      const { data: authData } = await testClient.auth.signInWithPassword({
        email: TEST_USERS.client.email,
        password: TEST_USERS.client.password,
      })
      await authDelay()

      const { data, error } = await testClient
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .single()

      expect(error).toBeNull()
      expect(data?.email).toBe('client.test@example.com')
      expect(data?.role).toBe('client')

      await testClient.auth.signOut()
      await authDelay()
    })
  })

  describe('5. User Clients (RLS Client Filtering)', () => {
    it('should have CLIENT_ALPHA for client.test', async () => {
      const { data: authData } = await testClient.auth.signInWithPassword({
        email: TEST_USERS.client.email,
        password: TEST_USERS.client.password,
      })
      await authDelay()

      const { data, error } = await testClient
        .from('user_clients')
        .select('*')
        .eq('user_id', authData.user?.id)
        .single()

      expect(error).toBeNull()
      expect(data?.client_filter).toBe('CLIENT_ALPHA')

      await testClient.auth.signOut()
      await authDelay()
    })

    it('should have CLIENT_UNAUTHORIZED for unauthorized.test', async () => {
      const { data: authData } = await testClient.auth.signInWithPassword({
        email: TEST_USERS.unauthorized.email,
        password: TEST_USERS.unauthorized.password,
      })
      await authDelay()

      const { data, error } = await testClient
        .from('user_clients')
        .select('*')
        .eq('user_id', authData.user?.id)
        .single()

      expect(error).toBeNull()
      expect(data?.client_filter).toBe('CLIENT_UNAUTHORIZED')

      await testClient.auth.signOut()
      await authDelay()
    })
  })

  describe('6. Test Data Factories', () => {
    it('should create deterministic project data', () => {
      resetFactoryIds()

      const project1 = mockProject({ title: 'Test Project 1' })
      const project2 = mockProject({ title: 'Test Project 2' })

      expect(project1.id).toBeDefined()
      expect(project2.id).toBeDefined()
      expect(project1.id).not.toBe(project2.id)
      expect(project1.title).toBe('Test Project 1')
    })

    it('should reset factory IDs', () => {
      resetFactoryIds()
      const project1 = mockProject()

      resetFactoryIds()
      const project2 = mockProject()

      // After reset, IDs should be reproducible
      expect(project1.id).toBe(project2.id)
    })

    it('should create script data', () => {
      const script = mockScript({ title: 'Smoke Test Script' })

      expect(script.id).toBeDefined()
      expect(script.title).toBe('Smoke Test Script')
    })
  })

  describe('7. Basic Query Execution', () => {
    it('should query user_profiles table', async () => {
      await testClient.auth.signInWithPassword({
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      })
      await authDelay()

      const { data, error } = await testClient
        .from('user_profiles')
        .select('email, role')
        .limit(5)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      await testClient.auth.signOut()
    })
  })
})
