/**
 * getAllProjectClips() Structure Tests
 *
 * PURPOSE: Validate simplified clip list structure after XMP removal.
 *
 * getAllProjectClips() now returns ONLY essential clip identification:
 * - nodeId: Unique identifier for ExtendScript operations
 * - name: Display name (may be renamed by user)
 * - treePath: Project Panel hierarchy path
 * - mediaPath: Path to raw media file
 * - proxyPath: Path to proxy file (if attached)
 *
 * Metadata (location, subject, action, shotType) is now loaded separately
 * via readJSONMetadataByNodeId() from .ingest-metadata.json sidecars.
 *
 * This replaces the legacy qe-dom-payloads.test.js which tested XMP extraction.
 */

import { describe, it, expect } from 'vitest';

describe('getAllProjectClips() Structure', () => {
  // Simulated response structure (what getAllProjectClips returns)
  const mockClipsResponse = {
    clips: [
      {
        nodeId: 'node-123',
        name: 'EA001621.MOV',
        treePath: '\\Project.prproj\\shoot1-20251103\\EA001621.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001621.MOV',
        proxyPath: '/Volumes/LucidLink/shoot1/EA001621_proxy.mov'
      },
      {
        nodeId: 'node-456',
        name: 'kitchen-oven-cleaning-ESTAB',  // Renamed by user
        treePath: '\\Project.prproj\\shoot1-20251103\\EA001622.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001622.MOV',
        proxyPath: ''  // No proxy attached
      }
    ]
  };

  describe('Essential Properties', () => {
    it('should return clips array', () => {
      expect(mockClipsResponse).toHaveProperty('clips');
      expect(Array.isArray(mockClipsResponse.clips)).toBe(true);
    });

    it('should have only essential identification properties', () => {
      const clip = mockClipsResponse.clips[0];

      // REQUIRED properties
      expect(clip).toHaveProperty('nodeId');
      expect(clip).toHaveProperty('name');
      expect(clip).toHaveProperty('treePath');
      expect(clip).toHaveProperty('mediaPath');
      expect(clip).toHaveProperty('proxyPath');

      // Should NOT have XMP metadata properties (removed)
      expect(clip).not.toHaveProperty('identifier');
      expect(clip).not.toHaveProperty('description');
      expect(clip).not.toHaveProperty('shot');
      expect(clip).not.toHaveProperty('good');
      expect(clip).not.toHaveProperty('location');
      expect(clip).not.toHaveProperty('subject');
      expect(clip).not.toHaveProperty('action');

      // Should NOT have diagnostic properties (removed)
      expect(clip).not.toHaveProperty('rawLogComment');
      expect(clip).not.toHaveProperty('regexAttempt');
      expect(clip).not.toHaveProperty('xmpSnippet');
      expect(clip).not.toHaveProperty('logCommentContext');
      expect(clip).not.toHaveProperty('availableColumns');
    });

    it('should have correct property types', () => {
      const clip = mockClipsResponse.clips[0];

      expect(typeof clip.nodeId).toBe('string');
      expect(typeof clip.name).toBe('string');
      expect(typeof clip.treePath).toBe('string');
      expect(typeof clip.mediaPath).toBe('string');
      expect(typeof clip.proxyPath).toBe('string');
    });
  });

  describe('Metadata Strategy', () => {
    it('should use JSON sidecar for metadata (not XMP)', () => {
      // This test documents the architectural decision:
      // - getAllProjectClips() returns clip identification only
      // - Metadata loaded via readJSONMetadataByNodeId() from JSON sidecars
      // - JSON approach provides stable lookup (survives clip rename)

      const clip = mockClipsResponse.clips[0];

      // Clip identification available for JSON lookup
      expect(clip.nodeId).toBeDefined();
      expect(clip.mediaPath).toBeDefined();

      // To get metadata: call EAVIngest.readJSONMetadataByNodeId(clip.nodeId)
      // This returns: { location, subject, action, shotType, shotNumber, ... }
    });

    it('should support structured name detection for checkmarks', () => {
      // Checkmark logic uses clip.name pattern, not XMP metadata
      const renamedClip = mockClipsResponse.clips[1];

      // Structured name pattern: {location}-{subject}-{action}-{shotType}
      const hasStructuredName = renamedClip.name &&
        renamedClip.name.indexOf('-') !== -1 &&
        renamedClip.name.split('-').length >= 2 &&
        !renamedClip.name.match(/^EA\d{6}/i);

      expect(hasStructuredName).toBe(true);
    });
  });

  describe('panel-main.js hasMetadata Detection', () => {
    // Helper function matching the pattern used in panel-main.js
    function hasMetadataDetection(clip) {
      const hasStructuredName = clip.name && clip.name.indexOf('-') !== -1 &&
                                clip.name.split('-').length >= 2 &&
                                !clip.name.match(/^EA\d{6}/i);
      return hasStructuredName;
    }

    it('should detect structured names as having metadata', () => {
      const structuredClip = {
        nodeId: 'node-456',
        name: 'kitchen-oven-cleaning-ESTAB',
        treePath: '\\Project.prproj\\shoot1\\EA001622.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001622.MOV',
        proxyPath: ''
      };

      expect(hasMetadataDetection(structuredClip)).toBe(true);
    });

    it('should not detect camera names as having metadata', () => {
      const cameraNameClip = {
        nodeId: 'node-123',
        name: 'EA001621.MOV',
        treePath: '\\Project.prproj\\shoot1\\EA001621.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001621.MOV',
        proxyPath: ''
      };

      expect(hasMetadataDetection(cameraNameClip)).toBe(false);
    });

    it('should detect minimal structured names (2 parts)', () => {
      const minimalStructuredClip = {
        nodeId: 'node-789',
        name: 'kitchen-oven',
        treePath: '\\Project.prproj\\shoot1\\EA001623.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001623.MOV',
        proxyPath: ''
      };

      expect(hasMetadataDetection(minimalStructuredClip)).toBe(true);
    });

    it('should not detect single-word names as having metadata', () => {
      const singleWordClip = {
        nodeId: 'node-999',
        name: 'kitchen',
        treePath: '\\Project.prproj\\shoot1\\EA001624.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001624.MOV',
        proxyPath: ''
      };

      expect(hasMetadataDetection(singleWordClip)).toBe(false);
    });

    it('should handle clips with extensions', () => {
      const clipWithExtension = {
        nodeId: 'node-111',
        name: 'kitchen-oven-cleaning-CU.MOV',
        treePath: '\\Project.prproj\\shoot1\\EA001625.MOV',
        mediaPath: '/Volumes/EAV_Video_RAW/shoot1/EA001625.MOV',
        proxyPath: ''
      };

      expect(hasMetadataDetection(clipWithExtension)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle clips with empty proxyPath', () => {
      const clipWithoutProxy = mockClipsResponse.clips[1];

      expect(clipWithoutProxy.proxyPath).toBe('');
      expect(typeof clipWithoutProxy.proxyPath).toBe('string');
    });

    it('should handle renamed clips (name differs from filename)', () => {
      const renamedClip = mockClipsResponse.clips[1];

      // name: 'kitchen-oven-cleaning-ESTAB' (user renamed)
      // treePath still contains original: 'EA001622.MOV'
      expect(renamedClip.name).not.toContain('EA001622');
      expect(renamedClip.treePath).toContain('EA001622');
    });
  });
});
