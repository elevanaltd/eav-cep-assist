/**
 * Comments Module - Collaborative commenting system with capability configuration
 *
 * Barrel export for @workspace/shared/comments
 * Provides comment domain logic, state management, hooks, and TipTap extensions
 */

// Domain layer - capabilities configuration
export type { CommentCapabilities } from './domain/capabilities.js';
export { SCRIPTS_WEB_CAPABILITIES, CAM_OP_CAPABILITIES } from './domain/capabilities.js';

// Domain layer - position recovery
export { recoverCommentPosition } from './domain/positionRecovery.js';
export type { MatchQuality, RecoveryStatus, TextMatchResult, PositionRecoveryResult } from './domain/positionRecovery.js';

// Domain layer - repository operations
export {
  createComment,
  getComments,
  updateComment,
  resolveComment,
  unresolveComment,
  deleteComment,
  clearUserProfileCache
} from './domain/repository.js';

// Domain types
export type {
  CommentRow,
  CommentInsert,
  CommentUpdate,
  Comment,
  CommentWithUser,
  CommentThread,
  CommentAnchor,
  CreateCommentData,
  ResolveCommentData,
  CommentFilters
} from './domain/types.js';

// State management - stores and mutations
export { useCommentStore } from './state/commentStore.js';
export type { OptimisticComment, CommentUISlice } from './state/commentStore.js';
export { useCommentMutations } from './state/useCommentMutations.js';
export type { UpdateCommentParams, ResolveCommentParams } from './state/useCommentMutations.js';
export { useCommentsQuery } from './state/useCommentsQuery.js';

// Hooks - orchestration layer
export { useComments } from './hooks/useComments.js';

// TipTap extensions - editor integration
export {
  CommentHighlightExtension,
  CommentPositionTracker,
  loadTipTapExtension
} from './extensions/index.js';
export type { CommentHighlightOptions } from './extensions/index.js';
