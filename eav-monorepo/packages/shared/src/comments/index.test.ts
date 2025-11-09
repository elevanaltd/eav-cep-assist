/**
 * Barrel Export Verification Test
 *
 * Constitutional Note: Barrel exports are infrastructure (type forwarding, re-exports)
 * This test verifies exports are accessible, not behavior (behavior tested in source modules)
 */

import { describe, it, expect } from 'vitest';
import * as CommentsModule from './index.js';

describe('Comments Barrel Export', () => {
  it('exports key comment domain functions', () => {
    expect(CommentsModule.createComment).toBeDefined();
    expect(CommentsModule.getComments).toBeDefined();
    expect(CommentsModule.updateComment).toBeDefined();
    expect(CommentsModule.deleteComment).toBeDefined();
  });

  it('exports comment state hooks', () => {
    expect(CommentsModule.useCommentStore).toBeDefined();
    expect(CommentsModule.useCommentMutations).toBeDefined();
    expect(CommentsModule.useCommentsQuery).toBeDefined();
  });

  it('exports orchestration hooks', () => {
    expect(CommentsModule.useComments).toBeDefined();
  });

  it('exports TipTap extensions', () => {
    expect(CommentsModule.CommentHighlightExtension).toBeDefined();
    expect(CommentsModule.CommentPositionTracker).toBeDefined();
  });

  it('exports capability configuration', () => {
    expect(CommentsModule.SCRIPTS_WEB_CAPABILITIES).toBeDefined();
    expect(CommentsModule.CAM_OP_CAPABILITIES).toBeDefined();
  });
});
