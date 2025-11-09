/**
 * Types Module - Database and API Types
 * Phase 2 Day 2: Supabase-generated types implementation
 *
 * Re-exports generated database types from Supabase schema
 * Generated via: npx supabase gen types typescript --project-id zbxvjyrbkycbfhwmmnmy
 */

// Re-export generated types
export type { Database, Json } from './database.types.js'

// Import for use in type helpers
import type { Database } from './database.types.js'

// Type helpers for easier table access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
