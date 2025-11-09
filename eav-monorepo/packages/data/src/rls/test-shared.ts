/**
 * Shared Test Utilities for RLS Module
 * Phase 2 Day 5: Test co-location remediation
 *
 * Constitutional Principle: DRY while maintaining 1:1 test file ratio
 *
 * Provides common test infrastructure to avoid duplication across
 * per-file test files while complying with test co-location mandate.
 *
 * NOTE: This file is a test utility helper, not implementation requiring tests.
 * Pattern: Similar to vitest's describe/it/expect - shared test infrastructure.
 * TDD Exception: Shared test utilities don't require tests (self-validating via usage).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/index.js'

/**
 * Test configuration constants
 * Would use real Supabase in integration tests
 */
export const TEST_SUPABASE_URL = 'https://test.supabase.co'
export const TEST_SUPABASE_KEY = 'test-key'

/**
 * Creates a mock Supabase client for RLS testing
 *
 * @returns Mock SupabaseClient with common methods stubbed
 */
export function createMockSupabaseClient(): SupabaseClient<Database> {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  } as any as SupabaseClient<Database>
}

/**
 * Mock query builder return type
 */
interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  [key: string]: unknown
}

/**
 * Creates a mock query builder with customizable behavior
 *
 * @param overrides - Custom behavior for query builder methods
 * @returns Mock query builder
 */
export function createMockQueryBuilder(overrides?: Record<string, unknown>): MockQueryBuilder {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
}

/**
 * Mock user context type
 */
interface MockUserContext {
  id: string
  email: string
  role: string
}

/**
 * Creates a mock authenticated user context
 *
 * @param userId - User ID to use in mock
 * @returns Mock user context
 */
export function createMockUserContext(userId: string): MockUserContext {
  return {
    id: userId,
    email: `${userId}@test.com`,
    role: 'authenticated',
  }
}

/**
 * Test role configurations for RLS policy testing
 */
export const TEST_ROLES = {
  admin: { email: 'mock-admin@test.com', password: 'mock-password' },
  client: { email: 'mock-client@test.com', password: 'mock-password' },
  unauthorized: { email: 'mock-unauthorized@test.com', password: 'mock-password' },
}

/**
 * Standard RLS policy expectations for testing
 */
export const RLS_EXPECTATIONS = {
  admin: { canRead: true, canWrite: true },
  client: { canRead: true, canWrite: false },
  unauthorized: { canRead: false, canWrite: false },
}
