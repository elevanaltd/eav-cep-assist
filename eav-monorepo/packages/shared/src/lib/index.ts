/**
 * @eav-ops/shared-lib - Main entry point
 * Phase 1: Infrastructure setup complete
 *
 * Re-exports all modules for easy consumption:
 * - client: Supabase client factory
 * - types: Database and API types
 * - auth: Authentication utilities
 * - rls: Row Level Security utilities
 * - navigation: Navigation context types (Quest A)
 */

// Client module - Supabase client factory
export * from './client/index.js'

// Types module - Database and API types
export * from './types/index.js'

// Auth module - Authentication utilities
export * from './auth/index.js'

// RLS module - Row Level Security utilities
export * from './rls/index.js'

// Navigation module - Navigation context types and provider (Quest A: Tasks A1-A2)
export * from './navigation/NavigationContext.js'
export { NavigationProvider, useNavigation } from './navigation/NavigationProvider.js'

// Dropdowns module - Database-driven dropdown options (Phase 0.1)
export * from './dropdowns/index.js'
