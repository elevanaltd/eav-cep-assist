/**
 * @workspace/shared - Modularized shared library for EAV Operations Suite
 *
 * Re-exports from modular packages:
 * - @workspace/data (database client, types, validation, RLS)
 * - @workspace/auth (React AuthContext, session management)
 * - @workspace/ui (navigation, components)
 * - Plus scripts-web specific modules
 *
 * Issue #29: Modularization complete - Phases 1-3 extracted
 */

// ============================================================================
// Re-exports from @workspace/data
// ============================================================================

// Client module
export * from '@workspace/data/client';

// Types module
export * from '@workspace/data/types';

// Database module (ComponentData exported from scripts/index.ts for backward compatibility)
export { validateComponentData, validateComponentArray, ValidationError } from '@workspace/data/database';

// Errors module
export * from '@workspace/data/errors';

// Services module
export * from '@workspace/data/services';

// RLS module
export * from '@workspace/data/rls';

// Mappers module
export * from '@workspace/data/mappers';

// Test infrastructure
export * from '@workspace/data/test';

// ============================================================================
// Re-exports from @workspace/auth
// ============================================================================

export * from '@workspace/auth';

// ============================================================================
// Re-exports from @workspace/ui
// ============================================================================

// Main UI package (includes contexts)
export * from '@workspace/ui';

// Navigation
export * from '@workspace/ui/navigation';

// Components
export * from '@workspace/ui/components';

// ============================================================================
// Scripts-Web Specific Exports (not extracted)
// ============================================================================

// Comments module - scripts-web specific
export * from './comments/index.js';
export * from './comments/extensions/index.js';

// Scripts module - scripts-web specific
export * from './scripts/index.js';

// Editor module - scripts-web specific
export * from './editor/index.js';

// Dropdowns module - scripts-web specific database utils
export * from './lib/dropdowns/index.js';
