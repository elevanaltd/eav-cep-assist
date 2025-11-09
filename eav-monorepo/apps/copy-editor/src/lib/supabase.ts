import { getSupabaseClient } from '@workspace/shared/client'

// Critical-Engineer: consulted for shared library integration and type safety
// Decision: Use singleton from @workspace/shared to prevent multiple GoTrueClient instances
// Previous: createBrowserClient() created duplicate instance (production warning)
// Fix: getSupabaseClient() returns shared singleton (production requirement)
// Validation: TypeScript 0 errors, single module version, NO console warnings

// Supabase client - shared singleton from @workspace/shared
export const supabase = getSupabaseClient()