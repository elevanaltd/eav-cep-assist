/**
 * Capability-Config Pattern for Comments Module
 *
 * Enables different apps to use comments with different constraints:
 * - scripts-web: Strict mode (requireAnchors, enablePositionRecovery, enableTipTapIntegration all true)
 * - cam-op-pwa: Flexible mode (requireAnchors, enablePositionRecovery, enableTipTapIntegration all false)
 *
 * Week 1 TDD Evidence: capability-config.integration.test.ts written BEFORE this implementation (commit ed7a8b6)
 * Week 2 GREEN: Tests transition from FAIL → PASS when this pattern implemented
 */
export interface CommentCapabilities {
  /** true = require text selection for comments, false = allow zero-length anchors (script-level comments) */
  requireAnchors: boolean;

  /** true = attempt position recovery when text changes, false = skip recovery path */
  enablePositionRecovery: boolean;

  /** true = load TipTap extension for position tracking, false = work without TipTap (cam-op use case) */
  enableTipTapIntegration: boolean;
}

/** scripts-web strict configuration */
export const SCRIPTS_WEB_CAPABILITIES: CommentCapabilities = {
  requireAnchors: true,
  enablePositionRecovery: true,
  enableTipTapIntegration: true
}

/** cam-op-pwa flexible configuration */
export const CAM_OP_CAPABILITIES: CommentCapabilities = {
  requireAnchors: false,
  enablePositionRecovery: false,
  enableTipTapIntegration: false
}
