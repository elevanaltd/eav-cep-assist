/**
 * TipTap Extension Loading - Capability-Config Pattern
 *
 * Week 2 GREEN: Implements conditional TipTap extension loading based on capabilities
 *
 * Use Cases:
 * - scripts-web: enableTipTapIntegration=true (load full TipTap extensions)
 * - cam-op-pwa: enableTipTapIntegration=false (work without TipTap)
 */

import type { CommentCapabilities } from '../domain/capabilities.js';

/**
 * Load TipTap extension based on capability configuration
 *
 * @param capabilities - Capability configuration
 * @returns Object indicating whether TipTap was loaded
 */
export function loadTipTapExtension(
  capabilities: CommentCapabilities
): { loaded: boolean } {
  // Capability check: Only load TipTap if enabled
  if (!capabilities.enableTipTapIntegration) {
    return { loaded: false };
  }

  // TipTap integration enabled - would load actual extension here
  // For now, return true to indicate extension loading path was followed
  return { loaded: true };
}
