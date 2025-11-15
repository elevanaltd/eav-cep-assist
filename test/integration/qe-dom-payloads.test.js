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

    it('should contain required clip properties', () => {
      const fixture = loadFixture('qe-dom-offline.json');
      const firstClip = fixture[0];

      // Core identification properties
      expect(firstClip).toHaveProperty('nodeId');
      expect(firstClip).toHaveProperty('name');
      expect(firstClip).toHaveProperty('treePath');
      expect(firstClip).toHaveProperty('mediaPath');

      // Metadata properties (from XMP parsing)
      expect(firstClip).toHaveProperty('identifier');
      expect(firstClip).toHaveProperty('description');
      expect(firstClip).toHaveProperty('shot');
      expect(firstClip).toHaveProperty('good');
      expect(firstClip).toHaveProperty('location');
      expect(firstClip).toHaveProperty('subject');
      expect(firstClip).toHaveProperty('action');

      // Diagnostic properties (debugging aids)
      expect(firstClip).toHaveProperty('rawLogComment');
      expect(firstClip).toHaveProperty('regexAttempt');
      expect(firstClip).toHaveProperty('xmpSnippet');
      expect(firstClip).toHaveProperty('logCommentContext');
      expect(firstClip).toHaveProperty('availableColumns');
    });

    it('should have correct property types', () => {
      const fixture = loadFixture('qe-dom-offline.json');
      const firstClip = fixture[0];

      // String properties
      expect(typeof firstClip.nodeId).toBe('string');
      expect(typeof firstClip.name).toBe('string');
      expect(typeof firstClip.treePath).toBe('string');
      expect(typeof firstClip.mediaPath).toBe('string');

      // Metadata strings (may be empty but must be strings)
      expect(typeof firstClip.identifier).toBe('string');
      expect(typeof firstClip.description).toBe('string');
      expect(typeof firstClip.shot).toBe('string');
      expect(typeof firstClip.good).toBe('string');
      expect(typeof firstClip.location).toBe('string');
      expect(typeof firstClip.subject).toBe('string');
      expect(typeof firstClip.action).toBe('string');

      // Diagnostic strings
      expect(typeof firstClip.rawLogComment).toBe('string');
      expect(typeof firstClip.regexAttempt).toBe('string');
      expect(typeof firstClip.xmpSnippet).toBe('string');
      expect(typeof firstClip.logCommentContext).toBe('string');
      expect(typeof firstClip.availableColumns).toBe('string');
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
  });

  describe('Online Scenario (Network Media)', () => {
    it('should match expected getAllProjectClips() structure', () => {
      // Online scenario may have different media paths but identical structure
      const fixture = loadFixture('qe-dom-online.json');

      expect(fixture).toBeDefined();
      expect(Array.isArray(fixture)).toBe(true);
      expect(fixture.length).toBeGreaterThan(0);
    });

    it('should have identical structure to offline scenario', () => {
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

      // Find a clip with empty metadata (if any)
      const emptyMetadataClip = fixture.find(clip =>
        clip.identifier === '' &&
        clip.description === '' &&
        clip.location === '' &&
        clip.subject === '' &&
        clip.action === ''
      );

      // If we have such a clip, validate it still has required structure
      if (emptyMetadataClip) {
        expect(emptyMetadataClip).toHaveProperty('nodeId');
        expect(emptyMetadataClip).toHaveProperty('name');
        expect(emptyMetadataClip.rawLogComment).toBe('NOT_FOUND_IN_XMP');
      }
    });

    it('should handle XMP parsing errors gracefully', () => {
      const fixture = loadFixture('qe-dom-offline.json');

      // Find a clip with XMP errors (if any)
      const errorClip = fixture.find(clip =>
        clip.xmpSnippet && clip.xmpSnippet.startsWith('ERROR:')
      );

      // If we have error clips, validate they still have required structure
      if (errorClip) {
        expect(errorClip).toHaveProperty('nodeId');
        expect(errorClip).toHaveProperty('name');
        expect(errorClip.regexAttempt).toBe('ERROR_BEFORE_REGEX');
      }
    });
  });
});
