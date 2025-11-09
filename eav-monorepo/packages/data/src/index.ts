/**
 * @workspace/data - Pure Data Layer
 *
 * Supabase client, types, database utilities, RLS helpers
 * No React dependencies (pure data/business logic)
 *
 * Extracted from @workspace/shared for modularization
 * Issue #29: @workspace/shared modularization
 */

// Re-export all modules for convenience
export * from './client/index';
export * from './types/index';
export * from './database/index';
export * from './errors/index';
export * from './services/index';
export * from './rls/index';
export * from './mappers/index';
export * from './auth/index';
