/**
 * Database Module - Validation schemas and database utilities
 *
 * Barrel export for @workspace/shared/database
 * Provides Zod validation schemas, type-safe validators, and sanitization
 */

// Validation schemas
export {
  projectIdSchema,
  videoIdSchema,
  scriptIdSchema,
  scriptContentSchema,
  componentDataSchema
} from './validation.js';

// Validation functions
export {
  validateProjectId,
  validateVideoId,
  validateScriptId,
  validateScriptContent,
  validateComponentData,
  validateComponentArray,
  sanitizeHTMLServerSide,
  createValidationMiddleware
} from './validation.js';

// Types and errors
export type { ComponentData } from './validation.js';
export { ValidationError } from './validation.js';
