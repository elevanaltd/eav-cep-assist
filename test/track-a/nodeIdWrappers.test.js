/**
 * Unit tests for nodeId wrapper functions
 * Tests CEP Panel integration - readJSONMetadataByNodeId() and writeJSONMetadataByNodeId()
 * These functions lookup clips by nodeId and call Track A functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readJSONMetadataByNodeId,
  writeJSONMetadataByNodeId
} from '../../src/track-a/json-integration.js';
import {
  MockFile,
  MockProjectItem,
  MockExtendScriptGlobal,
  setupExtendScriptGlobals,
  findProjectItemByNodeId
} from '../helpers/extendscript-mocks.js';
import * as fs from 'fs';
import * as path from 'path';

// Test directory for JSON files
const TEST_DIR = '/tmp/track-a-nodeid-tests';
const PROXY_DIR = path.join(TEST_DIR, 'proxy');
const RAW_DIR = path.join(TEST_DIR, 'raw');

describe('readJSONMetadataByNodeId()', () => {
  let globals;

  beforeEach(() => {
    // Create test directories
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROXY_DIR)) {
      fs.mkdirSync(PROXY_DIR, { recursive: true });
    }
    if (!fs.existsSync(RAW_DIR)) {
      fs.mkdirSync(RAW_DIR, { recursive: true });
    }

    // Setup ExtendScript globals
    const clip1 = new MockProjectItem({
      name: 'EAV0TEST1.MOV',
      nodeId: 'clip-node-id-1',
      proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
      mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
    });

    const clip2 = new MockProjectItem({
      name: 'EAV0TEST2.MOV',
      nodeId: 'clip-node-id-2',
      proxyPath: path.join(PROXY_DIR, 'EAV0TEST2_Proxy.mov'),
      mediaPath: path.join(RAW_DIR, 'EAV0TEST2.MOV')
    });

    globals = setupExtendScriptGlobals({
      clips: [clip1, clip2]
    });
  });

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Happy Path', () => {
    it('should read metadata for clip by nodeId', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "kitchen-oven-cleaning-ESTAB-#1",
          "location": "kitchen",
          "subject": "oven",
          "action": "cleaning",
          "shotType": "ESTAB",
          "shotNumber": 1
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const result = readJSONMetadataByNodeId(
        'clip-node-id-1',
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).not.toBe('null');

      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('EAV0TEST1');
      expect(parsed.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
      expect(parsed.location).toBe('kitchen');
    });

    it('should find correct clip among multiple clips', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "clip-1-name"
        },
        "EAV0TEST2": {
          "id": "EAV0TEST2",
          "shotName": "clip-2-name"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      // Read clip 1
      const result1 = readJSONMetadataByNodeId(
        'clip-node-id-1',
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      // Read clip 2
      const result2 = readJSONMetadataByNodeId(
        'clip-node-id-2',
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      const parsed1 = JSON.parse(result1);
      const parsed2 = JSON.parse(result2);

      expect(parsed1.shotName).toBe('clip-1-name');
      expect(parsed2.shotName).toBe('clip-2-name');
    });

    it('should delegate to readJSONMetadata() correctly', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "location": "kitchen",
          "subject": "oven",
          "action": "cleaning",
          "shotType": "ESTAB",
          "shotNumber": 1
          // shotName missing - should be computed
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const result = readJSONMetadataByNodeId(
        'clip-node-id-1',
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      const parsed = JSON.parse(result);

      // shotName should be computed by readJSONMetadata
      expect(parsed.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
    });
  });

  describe('Error Handling', () => {
    it('should return "null" when no active project', () => {
      const noProjectGlobals = setupExtendScriptGlobals();
      noProjectGlobals.app.project = null;

      const result = readJSONMetadataByNodeId(
        'clip-node-id-1',
        noProjectGlobals.app,
        findProjectItemByNodeId,
        MockFile,
        noProjectGlobals.$
      );

      expect(result).toBe('null');

      // Check error log
      const logs = noProjectGlobals.$.getLogsByPrefix('ERROR: No active project');
      expect(logs.length).toBe(1);
    });

    it('should return "null" when clip not found by nodeId', () => {
      const result = readJSONMetadataByNodeId(
        'nonexistent-node-id',
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('null');

      // Check error log
      const logs = globals.$.getLogsByPrefix('ERROR: Clip not found for nodeId');
      expect(logs.length).toBe(1);
    });

    it('should return "null" when JSON file not found', () => {
      // No JSON file created
      const result = readJSONMetadataByNodeId(
        'clip-node-id-1',
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('null');
    });

    it('should handle exceptions gracefully', () => {
      // Pass invalid app object to trigger exception
      const result = readJSONMetadataByNodeId(
        'clip-node-id-1',
        { project: null },
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('null');

      // Check for error log (project is null)
      const logs = globals.$.getLogsByPrefix('ERROR: No active project');
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('CEP Integration', () => {
    it('should work as CEP Panel → ExtendScript bridge', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "test-name",
          "location": "kitchen"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      // Simulate CEP Panel calling ExtendScript with nodeId
      const nodeId = 'clip-node-id-1';
      const result = readJSONMetadataByNodeId(
        nodeId,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      // CEP Panel would receive this JSON string and parse it
      expect(result).not.toBe('null');
      const metadata = JSON.parse(result);
      expect(metadata.shotName).toBe('test-name');
    });
  });
});

describe('writeJSONMetadataByNodeId()', () => {
  let globals;

  beforeEach(() => {
    // Create test directories
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROXY_DIR)) {
      fs.mkdirSync(PROXY_DIR, { recursive: true });
    }
    if (!fs.existsSync(RAW_DIR)) {
      fs.mkdirSync(RAW_DIR, { recursive: true });
    }

    // Setup ExtendScript globals
    const clip1 = new MockProjectItem({
      name: 'EAV0TEST1.MOV',
      nodeId: 'clip-node-id-1',
      proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
      mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
    });

    const clip2 = new MockProjectItem({
      name: 'EAV0TEST2.MOV',
      nodeId: 'clip-node-id-2',
      proxyPath: path.join(PROXY_DIR, 'EAV0TEST2_Proxy.mov'),
      mediaPath: path.join(RAW_DIR, 'EAV0TEST2.MOV')
    });

    globals = setupExtendScriptGlobals({
      clips: [clip1, clip2]
    });
  });

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Happy Path', () => {
    it('should write metadata for clip by nodeId', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotNumber": 1
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const updates = {
        location: "kitchen",
        subject: "oven",
        action: "cleaning",
        shotType: "ESTAB"
      };

      const result = writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('true');

      // Verify file was updated
      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      expect(clip.location).toBe('kitchen');
      expect(clip.subject).toBe('oven');
      expect(clip.action).toBe('cleaning');
      expect(clip.shotType).toBe('ESTAB');
      expect(clip.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
    });

    it('should update correct clip among multiple clips', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "location": "original1",
          "shotNumber": 1
        },
        "EAV0TEST2": {
          "id": "EAV0TEST2",
          "location": "original2",
          "shotNumber": 2
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      // Update clip 2 only
      const updates = { location: "UPDATED" };

      writeJSONMetadataByNodeId(
        'clip-node-id-2',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Clip 1 should be unchanged
      expect(updatedContent.EAV0TEST1.location).toBe('original1');

      // Clip 2 should be updated
      expect(updatedContent.EAV0TEST2.location).toBe('UPDATED');
    });

    it('should delegate to writeJSONMetadata() correctly', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "originalFilename": "EAV0TEST1.MOV",
          "shotNumber": 1,
          "createdAt": "2025-11-18T00:00:00Z",
          "createdBy": "ingest-assistant"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const updates = {
        location: "kitchen",
        subject: "oven",
        action: "cleaning",
        shotType: "ESTAB"
      };

      writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      // Check that writeJSONMetadata features work
      expect(clip.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1'); // Computed
      expect(clip.modifiedBy).toBe('cep-panel'); // Audit field
      expect(clip.createdBy).toBe('ingest-assistant'); // Preserved
    });
  });

  describe('Error Handling', () => {
    it('should return "false" when no active project', () => {
      const noProjectGlobals = setupExtendScriptGlobals();
      noProjectGlobals.app.project = null;

      const updates = { location: "kitchen" };
      const result = writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        noProjectGlobals.app,
        findProjectItemByNodeId,
        MockFile,
        noProjectGlobals.$
      );

      expect(result).toBe('false');

      // Check error log
      const logs = noProjectGlobals.$.getLogsByPrefix('ERROR: No active project');
      expect(logs.length).toBe(1);
    });

    it('should return "false" when clip not found by nodeId', () => {
      const updates = { location: "kitchen" };
      const result = writeJSONMetadataByNodeId(
        'nonexistent-node-id',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('false');

      // Check error log
      const logs = globals.$.getLogsByPrefix('ERROR: Clip not found for nodeId');
      expect(logs.length).toBe(1);
    });

    it('should return "false" when JSON file not found', () => {
      const updates = { location: "kitchen" };
      const result = writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('false');
    });

    it('should handle exceptions gracefully', () => {
      const updates = { location: "kitchen" };

      // Pass invalid app object to trigger exception
      const result = writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        { project: null },
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('false');

      // Check for error log (project is null)
      const logs = globals.$.getLogsByPrefix('ERROR: No active project');
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('CEP Integration', () => {
    it('should work as CEP Panel → ExtendScript bridge', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotNumber": 1
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      // Simulate CEP Panel sending updates via ExtendScript
      const nodeId = 'clip-node-id-1';
      const updates = {
        location: "kitchen",
        subject: "oven",
        action: "cleaning",
        shotType: "ESTAB"
      };

      const result = writeJSONMetadataByNodeId(
        nodeId,
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      // CEP Panel would receive "true" or "false"
      expect(result).toBe('true');
    });

    it('should handle updates object (not JSON string)', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotNumber": 1
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      // Note: In actual ExtendScript, CEP would pass JSON string
      // But in this testable version, we accept object directly
      const updates = {
        location: "hallway"
      };

      const result = writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      expect(result).toBe('true');

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      expect(updatedContent.EAV0TEST1.location).toBe('hallway');
    });
  });

  describe('Partial Updates', () => {
    it('should support partial metadata updates', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "location": "kitchen",
          "subject": "oven",
          "action": "cleaning",
          "shotType": "ESTAB",
          "shotNumber": 1
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      // Update only action field
      const updates = { action: "preheating" };

      writeJSONMetadataByNodeId(
        'clip-node-id-1',
        updates,
        globals.app,
        findProjectItemByNodeId,
        MockFile,
        globals.$
      );

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      // Action updated
      expect(clip.action).toBe('preheating');

      // Other fields preserved
      expect(clip.location).toBe('kitchen');
      expect(clip.subject).toBe('oven');
      expect(clip.shotType).toBe('ESTAB');

      // shotName recomputed
      expect(clip.shotName).toBe('kitchen-oven-preheating-ESTAB-#1');
    });
  });
});
