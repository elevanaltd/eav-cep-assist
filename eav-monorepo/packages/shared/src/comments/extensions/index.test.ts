/**
 * Extensions Barrel Export Test
 * Verifies all TipTap extensions and types are properly exported
 */
import { describe, it, expect } from 'vitest';
import * as ExtensionsModule from './index.js';

describe('Comments Extensions Barrel', () => {
  it('exports CommentHighlightExtension', () => {
    expect(ExtensionsModule.CommentHighlightExtension).toBeDefined();
  });

  it('exports CommentPositionTracker', () => {
    expect(ExtensionsModule.CommentPositionTracker).toBeDefined();
  });

  it('exports loadTipTapExtension', () => {
    expect(ExtensionsModule.loadTipTapExtension).toBeDefined();
  });
});
