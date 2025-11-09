/**
 * Auth Module - Authentication and user context management
 *
 * Barrel export for @workspace/shared/auth
 * Provides authentication context, user state, and auth operations
 */

export { AuthProvider, useAuth } from './AuthContext.js';
export type { UserProfile } from '../lib/mappers/userProfileMapper.js';
