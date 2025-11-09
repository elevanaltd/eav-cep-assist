/**
 * Scripts Barrel Export Verification Test
 *
 * Constitutional Note: Barrel exports are infrastructure (type forwarding, re-exports)
 * This test verifies exports are accessible, not behavior (behavior tested in source modules)
 */

import { describe, it, expect } from 'vitest';
import * as ScriptsModule from './index.js';

describe('Scripts Barrel Export', () => {
  it('exports script service functions', () => {
    expect(ScriptsModule.loadScriptForVideo).toBeDefined();
    expect(ScriptsModule.saveScript).toBeDefined();
    expect(ScriptsModule.saveScriptWithComponents).toBeDefined();
    expect(ScriptsModule.getScriptById).toBeDefined();
  });

  it('exports script store hook', () => {
    expect(ScriptsModule.useScriptStore).toBeDefined();
  });

  it('exports script hooks', () => {
    expect(ScriptsModule.useCurrentScript).toBeDefined();
    expect(ScriptsModule.useCurrentScriptData).toBeDefined();
    expect(ScriptsModule.useScriptMutations).toBeDefined();
  });
});
