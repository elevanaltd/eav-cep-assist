/**
 * Mappers Module - Database row to domain model transformations
 *
 * Barrel export for @workspace/data/mappers
 */

export {
  mapUserProfileRowToUserProfile,
  isValidUserRole,
  validateAndNormalizeRole
} from './userProfileMapper.js';
export type { UserProfile, UserRole } from './userProfileMapper.js';
