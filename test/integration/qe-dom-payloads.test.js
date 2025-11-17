/**
 * QE DOM Payload Characterization Tests
 *
 * PURPOSE: Capture baseline behavior of getAllProjectClips() before XMP-First refactor.
 *
 * These tests validate the EXACT structure returned by the QE DOM API
 * (qe.project.getProjectColumnsMetadata) to ensure XMP-First implementation
 * produces identical output.
 *
 * STRATEGY:
 * - RED: Test expects fixture structure (will fail until captured)
 * - GREEN: Capture actual QE DOM output from Premiere Pro
 * - REFACTOR: Enhance coverage and documentation
 *
 * FIXTURES:
 * - qe-dom-offline.json: Local media (no network)
 * - qe-dom-online.json: Network media (if applicable)
 *
 * CONTEXT: Part of B2.1 (Characterization Tests) in XMP-First refactor plan.
 */

import { describe, it, expect } from 'vitest';
import { loadFixture } from '../helpers/fixture-loader.js';

describe('QE DOM Payload Structure (Characterization)', () => {
  describe('Offline Scenario (Local Media)', () => {
    it('should match expected getAllProjectClips() structure', () => {
      // This will fail until fixture is captured manually from Premiere Pro
      const fixture = loadFixture('qe-dom-offline.json');

      // Validate top-level structure
      expect(fixture).toBeDefined();
      expect(Array.isArray(fixture)).toBe(true);
      expect(fixture.length).toBeGreaterThan(0);
    });

    it('should contain required clip properties for ALL clips', () => {
      const fixture = loadFixture('qe-dom-offline.json');

      // CODE REVIEW: Iterate ALL clips, not just first (previously only checked fixture[0])
      fixture.forEach((clip, index) => {
        // Core identification properties
        expect(clip, `clip[${index}]`).toHaveProperty('nodeId');
        expect(clip, `clip[${index}]`).toHaveProperty('name');
        expect(clip, `clip[${index}]`).toHaveProperty('treePath');
        expect(clip, `clip[${index}]`).toHaveProperty('mediaPath');

        // Metadata properties (from XMP parsing)
        expect(clip, `clip[${index}]`).toHaveProperty('identifier');
        expect(clip, `clip[${index}]`).toHaveProperty('description');
        expect(clip, `clip[${index}]`).toHaveProperty('shot');
        expect(clip, `clip[${index}]`).toHaveProperty('good');
        expect(clip, `clip[${index}]`).toHaveProperty('location');
        expect(clip, `clip[${index}]`).toHaveProperty('subject');
        expect(clip, `clip[${index}]`).toHaveProperty('action');

        // Diagnostic properties (debugging aids)
        expect(clip, `clip[${index}]`).toHaveProperty('rawLogComment');
        expect(clip, `clip[${index}]`).toHaveProperty('regexAttempt');
        expect(clip, `clip[${index}]`).toHaveProperty('xmpSnippet');
        expect(clip, `clip[${index}]`).toHaveProperty('logCommentContext');
        expect(clip, `clip[${index}]`).toHaveProperty('availableColumns');
      });
    });

    it('should have correct property types for ALL clips', () => {
      const fixture = loadFixture('qe-dom-offline.json');

      // CODE REVIEW: Iterate ALL clips, not just first
      fixture.forEach((clip, index) => {
        // String properties
        expect(typeof clip.nodeId, `clip[${index}].nodeId`).toBe('string');
        expect(typeof clip.name, `clip[${index}].name`).toBe('string');
        expect(typeof clip.treePath, `clip[${index}].treePath`).toBe('string');
        expect(typeof clip.mediaPath, `clip[${index}].mediaPath`).toBe('string');

        // Metadata strings (may be empty but must be strings)
        expect(typeof clip.identifier, `clip[${index}].identifier`).toBe('string');
        expect(typeof clip.description, `clip[${index}].description`).toBe('string');
        expect(typeof clip.shot, `clip[${index}].shot`).toBe('string');
        expect(typeof clip.good, `clip[${index}].good`).toBe('string');
        expect(typeof clip.location, `clip[${index}].location`).toBe('string');
        expect(typeof clip.subject, `clip[${index}].subject`).toBe('string');
        expect(typeof clip.action, `clip[${index}].action`).toBe('string');

        // Diagnostic strings
        expect(typeof clip.rawLogComment, `clip[${index}].rawLogComment`).toBe('string');
        expect(typeof clip.regexAttempt, `clip[${index}].regexAttempt`).toBe('string');
        expect(typeof clip.xmpSnippet, `clip[${index}].xmpSnippet`).toBe('string');
        expect(typeof clip.logCommentContext, `clip[${index}].logCommentContext`).toBe('string');
        expect(typeof clip.availableColumns, `clip[${index}].availableColumns`).toBe('string');
      });
    });

    it('should preserve XMP diagnostic fields for debugging', () => {
      const fixture = loadFixture('qe-dom-offline.json');
      const firstClip = fixture[0];

      // These diagnostic fields help understand QE DOM behavior
      // regexAttempt shows which XMP parsing path was taken
      expect(['lowercase-c-element-MATCHED', 'capital-C-element-MATCHED', 'lowercase-c-element-NO_MATCH', 'capital-C-element-NO_MATCH', 'ERROR_BEFORE_REGEX']).toContain(firstClip.regexAttempt);

      // rawLogComment shows what was actually parsed
      expect(firstClip.rawLogComment).toBeDefined();
      // Should be 'NOT_FOUND_IN_XMP' or actual structured data like 'location=X, subject=Y'
    });

    it('should cover all diagnostic parsing path variants', () => {
      const fixture = loadFixture('qe-dom-offline.json');

      // CODE REVIEW: Collect all diagnostic variants to ensure fixtures cover parsing branches
      const regexAttempts = new Set(fixture.map(clip => clip.regexAttempt));
      const availableColumnsVariants = new Set(fixture.map(clip => clip.availableColumns));

      // Ensure fixtures contain at least SOME diversity in parsing paths
      // (Exact coverage depends on real capture, but synthetic should show variety)
      expect(regexAttempts.size, 'Fixtures should show multiple regexAttempt paths').toBeGreaterThan(1);

      // Document which variants exist for debugging
      const variantSummary = {
        regexAttempts: Array.from(regexAttempts),
        availableColumnsVariants: Array.from(availableColumnsVariants),
      };

      // Log for manual verification (helps understand fixture coverage)
      console.log('Diagnostic variant coverage:', variantSummary);

      // After manual capture, fixtures SHOULD include:
      // - lowercase-c-element-MATCHED (IA-generated metadata)
      // - capital-C-element-MATCHED (CEP panel-written metadata)
      // - lowercase-c-element-NO_MATCH (no logComment found)
      // - NO_DIRECT_ACCESS (QE DOM columns unavailable)
      // This test will PASS with synthetic but SHOULD be enhanced post-capture
    });
  });

  describe('Online Scenario (Network Media)', () => {
    // CODE REVIEW: Skip online tests until real network media capture
    // Current implementation is symlink to offline, provides zero signal
    it.skip('should match expected getAllProjectClips() structure (TODO: real network capture)', () => {
      // TODO: Execute manual capture with network media project
      // Currently qe-dom-online.json is symlink to offline fixture
      // See test/manual/002-CAPTURE-QE-DOM-PAYLOADS.md for instructions
      const fixture = loadFixture('qe-dom-online.json');

      expect(fixture).toBeDefined();
      expect(Array.isArray(fixture)).toBe(true);
      expect(fixture.length).toBeGreaterThan(0);
    });

    it.skip('should have identical structure to offline scenario (TODO: real network capture)', () => {
      // TODO: After real network media capture, validate structure matches
      const offlineFixture = loadFixture('qe-dom-offline.json');
      const onlineFixture = loadFixture('qe-dom-online.json');

      // Structure should be identical (property names and types)
      const offlineKeys = Object.keys(offlineFixture[0]).sort();
      const onlineKeys = Object.keys(onlineFixture[0]).sort();

      expect(onlineKeys).toEqual(offlineKeys);
    });
  });

  describe('Edge Cases', () => {
    it('should handle clips with no metadata gracefully', () => {
      const fixture = loadFixture('qe-dom-offline.json');

      // CODE REVIEW: Enforce edge case exists in fixtures (don't short-circuit)
      const emptyMetadataClip = fixture.find(clip =>
        clip.identifier === '' &&
        clip.description === '' &&
        clip.location === '' &&
        clip.subject === '' &&
        clip.action === ''
      );

      // MANDATORY: Fixture MUST contain empty metadata clip for regression coverage
      expect(emptyMetadataClip, 'Fixture must contain at least one clip with no metadata (regression test)').toBeDefined();

      // Validate empty clip still has required structure
      expect(emptyMetadataClip).toHaveProperty('nodeId');
      expect(emptyMetadataClip).toHaveProperty('name');
      expect(emptyMetadataClip.rawLogComment).toBe('NOT_FOUND_IN_XMP');
    });

    it('should handle XMP parsing errors gracefully', () => {
      const fixture = loadFixture('qe-dom-offline.json');

      // CODE REVIEW: This edge case may not exist in synthetic fixtures
      // Skip enforcement until real capture (where errors might occur)
      const errorClip = fixture.find(clip =>
        clip.xmpSnippet && clip.xmpSnippet.startsWith('ERROR:')
      );

      // If error clips exist, validate structure (but don't enforce presence yet)
      if (errorClip) {
        expect(errorClip).toHaveProperty('nodeId');
        expect(errorClip).toHaveProperty('name');
        expect(errorClip.regexAttempt).toBe('ERROR_BEFORE_REGEX');
      } else {
        // Log for manual review - real capture might produce error clips
        console.log('INFO: No XMP parsing errors in fixtures (may change after real capture)');
      }
    });
  });
});
