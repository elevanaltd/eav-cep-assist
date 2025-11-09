/**
 * Auth Module - Authentication Utilities
 * Phase 2 Day 3: Core authentication functions
 *
 * Provides framework-agnostic authentication functions that wrap Supabase auth
 * Consumers (like scripts-web) can wrap these in React hooks as needed
 *
 * Constitutional Principle: MINIMAL_INTERVENTION_PRINCIPLE
 * - Pure functions, no React coupling
 * - Scripts-web composes these into hooks
 * - Keeps shared-lib framework-agnostic
 */

import type { SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js'
import type { Database } from '../types/index.js'

/**
 * Get current session from Supabase client
 * @param client - Supabase client instance
 * @returns Current session or null if not authenticated
 */
export async function getSession(client: SupabaseClient<Database>): Promise<Session | null> {
  const { data, error } = await client.auth.getSession()

  if (error) {
    console.error('[Auth] Error getting session:', error.message)
    return null
  }

  return data.session
}

/**
 * Sign in with email and password
 * @param client - Supabase client instance
 * @param email - User email
 * @param password - User password
 * @returns Result with session or error
 */
export async function signIn(
  client: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { session: null, error: new Error(error.message) }
  }

  return { session: data.session, error: null }
}

/**
 * Sign out current user
 * @param client - Supabase client instance
 */
export async function signOut(client: SupabaseClient<Database>): Promise<void> {
  const { error } = await client.auth.signOut()

  if (error) {
    console.error('[Auth] Error signing out:', error.message)
    throw new Error(error.message)
  }
}

/**
 * Sign up new user with email, password, and optional metadata
 * @param client - Supabase client instance
 * @param email - User email
 * @param password - User password
 * @param metadata - Optional user metadata (e.g., display_name)
 * @returns Result with session or error
 */
export async function signUp(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
  metadata?: Record<string, unknown>
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  })

  if (error) {
    return { session: null, error: new Error(error.message) }
  }

  return { session: data.session, error: null }
}

/**
 * Subscribe to auth state changes
 * @param client - Supabase client instance
 * @param callback - Function to call on auth state change
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  client: SupabaseClient<Database>,
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const { data: subscription } = client.auth.onAuthStateChange(callback)

  return () => {
    subscription.subscription.unsubscribe()
  }
}
