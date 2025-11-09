/**
 * Editor Module - TipTap editor utilities and component extraction
 *
 * Barrel export for @workspace/shared/editor
 * Provides component extraction, script locking, and editor-related utilities
 */

// Component extraction - paragraph-to-component transformation
export {
  extractComponents,
  isComponentParagraph
} from './componentExtraction.js';

// Note: ComponentData is exported from @workspace/data/database (via main index.ts)

// Script locking - edit lock management
export { useScriptLock } from './locking/useScriptLock.js';
export type { ScriptLockStatus } from './locking/useScriptLock.js';
