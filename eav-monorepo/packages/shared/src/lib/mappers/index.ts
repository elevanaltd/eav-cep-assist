/**
 * Mappers Module - Data transformation utilities
 *
 * Barrel export for @workspace/shared/lib/mappers
 * Provides mappers for converting between database rows and application types
 */

export { mapScriptRowToScript, normalizeScriptId, mapScriptComponentRow } from './scriptMapper.js';
export { mapUserProfileRowToUserProfile, isValidUserRole, validateAndNormalizeRole } from './userProfileMapper.js';
export type { UserProfile } from './userProfileMapper.js';
