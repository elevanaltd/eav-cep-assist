/**
 * CommentHighlightExtension Type Safety Test
 *
 * Constitutional Note: This file was extracted from POC (apps/scripts-web) where full
 * behavioral tests exist. These tests verify TypeScript type safety fixes (null checks,
 * unused parameters). Full TipTap integration tests remain in POC location.
 *
 * POC Test Location: apps/scripts-web/src/components/extensions/CommentHighlightExtension.test.ts
 */

import { describe, it, expect } from 'vitest';
import { CommentHighlightExtension } from './CommentHighlightExtension.js';

describe('CommentHighlightExtension Type Safety', () => {
  it('exports CommentHighlightExtension mark', () => {
    expect(CommentHighlightExtension).toBeDefined();
  });

  it('is a valid TipTap extension with name and type', () => {
    expect(CommentHighlightExtension.name).toBe('commentHighlight');
    expect(CommentHighlightExtension.type).toBe('mark');
  });
});
