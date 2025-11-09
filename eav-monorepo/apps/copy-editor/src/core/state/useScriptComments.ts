/**
 * useScriptComments.ts - Script-specific comment orchestration hook
 *
 * Architecture: App-specific orchestration layer over @workspace/shared/comments
 * Purpose: Compose shared useComments primitive with script context from useCurrentScript
 *
 * Pattern: Orchestration hook that bridges app state (currentScript) with shared primitives (useComments)
 * - Eliminates prop drilling (script ID derived from context)
 * - Provides app-configured capabilities (SCRIPTS_WEB_CAPABILITIES)
 * - Maintains single source of truth for script selection
 */

import { Editor } from '@tiptap/react';
import { useComments, SCRIPTS_WEB_CAPABILITIES } from '@workspace/shared/comments';
import { useCurrentScript } from './useCurrentScript';

/**
 * Scripts-web orchestration hook for comment functionality
 *
 * Composes:
 * - shared useComments hook (editor integration + comment CRUD)
 * - app context useCurrentScript (script selection state)
 * - app config SCRIPTS_WEB_CAPABILITIES (requires anchors, position recovery, TipTap integration)
 *
 * Benefits:
 * - Components don't need to pass scriptId (derived from app context)
 * - Centralized capability configuration for scripts-web app
 * - Maintains separation: shared primitives / app orchestration / UI components
 *
 * @param editor - TipTap editor instance (null during initialization)
 * @returns All useComments interface (queries, mutations, UI state, helpers)
 */
export const useScriptComments = (editor: Editor | null) => {
  const { currentScript } = useCurrentScript();

  // Compose shared primitive with app context
  return useComments(
    editor,
    currentScript?.id || null,
    SCRIPTS_WEB_CAPABILITIES
  );
};
