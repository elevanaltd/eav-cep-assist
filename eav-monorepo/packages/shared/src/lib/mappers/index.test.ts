/**
 * Mappers Barrel Export Verification Test
 *
 * Constitutional Note: Barrel exports are infrastructure (type forwarding, re-exports)
 * Full mapper behavior tests exist in scriptMapper.test.ts and userProfileMapper.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as MappersModule from './index.js';

describe('Mappers Barrel Export', () => {
  it('exports script mapper function', () => {
    expect(MappersModule.mapScriptRowToScript).toBeDefined();
    expect(typeof MappersModule.mapScriptRowToScript).toBe('function');
  });

  it('exports user profile mapper function', () => {
    expect(MappersModule.mapUserProfileRowToUserProfile).toBeDefined();
    expect(typeof MappersModule.mapUserProfileRowToUserProfile).toBe('function');
  });
});
