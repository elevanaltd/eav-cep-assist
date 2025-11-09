/**
 * Scripts Module - Script management and state
 *
 * Barrel export for @workspace/shared/scripts
 * Provides script service, state store, and React hooks for script operations
 */

// Domain layer - service functions
export {
  loadScriptForVideo,
  saveScript,
  saveScriptWithComponents,
  getScriptById,
  generateContentHash,
  updateScriptStatus
} from './domain/scriptService.js';
export type { ScriptWorkflowStatus, Script, ScriptServiceErrorInterface } from './domain/scriptService.js';

// Re-export ComponentData type for backward compatibility
export type { ComponentData } from '../database/validation.js';

// Domain layer - state store
export { useScriptStore } from './domain/scriptStore.js';

// Hooks - React integration
export { useCurrentScript } from './hooks/useCurrentScript.js';
export { useCurrentScriptData } from './hooks/useCurrentScriptData.js';
export { useScriptMutations } from './hooks/useScriptMutations.js';
