/**
 * Editor Barrel Export Verification Test
 *
 * Constitutional Note: Barrel exports are infrastructure (type forwarding, re-exports)
 * This test verifies exports are accessible, not behavior (behavior tested in source modules)
 */

import { describe, it, expect } from 'vitest';
import * as EditorModule from './index.js';

describe('Editor Barrel Export', () => {
  it('exports component extraction functions', () => {
    expect(EditorModule.extractComponents).toBeDefined();
    expect(EditorModule.isComponentParagraph).toBeDefined();
  });

  it('exports script locking hook', () => {
    expect(EditorModule.useScriptLock).toBeDefined();
  });
});
