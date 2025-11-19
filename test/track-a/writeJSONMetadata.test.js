/**
 * Unit tests for writeJSONMetadata() and writeJSONToFile() functions
 * Tests JSON metadata writing to .ingest-metadata.json files
 * Uses atomic write pattern (temp file + rename)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeJSONMetadata, writeJSONToFile } from '../../src/track-a/json-integration.js';
import {
  MockFile,
  MockProjectItem,
  MockExtendScriptGlobal
} from '../helpers/extendscript-mocks.js';
import * as fs from 'fs';
import * as path from 'path';

// Test directory for JSON files
const TEST_DIR = '/tmp/track-a-write-tests';
const PROXY_DIR = path.join(TEST_DIR, 'proxy');
const RAW_DIR = path.join(TEST_DIR, 'raw');

describe('writeJSONToFile()', () => {
  let $;

  beforeEach(() => {
    $ = new MockExtendScriptGlobal();

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

    // Mock Date for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-19T12:00:00Z'));
  });

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    vi.useRealTimers();
  });

  describe('Happy Path', () => {
    it('should write metadata updates to existing clip', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "originalFilename": "EAV0TEST1.MOV",
          "shotName": "old-name",
          "location": "kitchen",
          "subject": "oven",
          "action": "cleaning",
          "shotType": "ESTAB",
          "shotNumber": 1,
          "createdAt": "2025-11-18T00:00:00Z",
          "createdBy": "ingest-assistant"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = {
        location: "hallway",
        subject: "door",
        action: "opening",
        shotType: "CU"
      };

      const result = writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      expect(result).toBe('true');

      // Read back the file
      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      expect(clip.location).toBe('hallway');
      expect(clip.subject).toBe('door');
      expect(clip.action).toBe('opening');
      expect(clip.shotType).toBe('CU');
      expect(clip.shotName).toBe('hallway-door-opening-CU-#1');
      expect(clip.modifiedAt).toBe('2025-11-19T12:00:00.000Z');
      expect(clip.modifiedBy).toBe('cep-panel');
    });

    it('should create new clip entry if not exists', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "existing"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = {
        location: "bedroom",
        subject: "window",
        action: "closing",
        shotType: "MID",
        shotNumber: 5
      };

      const result = writeJSONToFile(jsonFile, 'EAV0TEST2.MOV', updates, $);

      expect(result).toBe('true');

      // Read back the file
      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Original clip should still exist
      expect(updatedContent.EAV0TEST1.shotName).toBe('existing');

      // New clip should be created
      const newClip = updatedContent.EAV0TEST2;
      expect(newClip.id).toBe('EAV0TEST2');
      expect(newClip.originalFilename).toBe('EAV0TEST2.MOV');
      expect(newClip.shotName).toBe('bedroom-window-closing-MID-#5');
    });

    it('should compute shotName from updated fields', () => {
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

      const jsonFile = new MockFile(jsonPath);
      const updates = {
        action: "preheating" // Only change action
      };

      const result = writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      expect(result).toBe('true');

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      expect(clip.shotName).toBe('kitchen-oven-preheating-ESTAB-#1');
    });

    it('should preserve unchanged fields', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "originalFilename": "EAV0TEST1.MOV",
          "location": "kitchen",
          "subject": "oven",
          "action": "cleaning",
          "shotType": "ESTAB",
          "shotNumber": 1,
          "keywords": ["oven", "kitchen"],
          "processedByAI": true,
          "createdAt": "2025-11-18T00:00:00Z",
          "createdBy": "ingest-assistant"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = {
        action: "preheating"
      };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      // Changed field
      expect(clip.action).toBe('preheating');

      // Unchanged fields preserved
      expect(clip.location).toBe('kitchen');
      expect(clip.subject).toBe('oven');
      expect(clip.shotNumber).toBe(1);
      expect(clip.keywords).toEqual(['oven', 'kitchen']);
      expect(clip.processedByAI).toBe(true);
      expect(clip.createdAt).toBe('2025-11-18T00:00:00Z');
      expect(clip.createdBy).toBe('ingest-assistant');
    });

    it('should update audit fields (modifiedAt, modifiedBy)', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "location": "kitchen",
          "modifiedAt": "2025-11-18T00:00:00Z",
          "modifiedBy": "ingest-assistant"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "hallway" };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      expect(clip.modifiedAt).toBe('2025-11-19T12:00:00.000Z');
      expect(clip.modifiedBy).toBe('cep-panel');
    });

    it('should write pretty-printed JSON (indentation)', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "kitchen" };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      const fileContent = fs.readFileSync(jsonPath, 'utf8');

      // Check for indentation (pretty print with 2 spaces)
      expect(fileContent).toContain('  "');
      expect(fileContent).toContain('\n');
    });
  });

  describe('Atomic Write Pattern', () => {
    it('should use temp file and rename (atomic write)', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": { "id": "EAV0TEST1" }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "kitchen" };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      // Temp file should be removed after rename
      const tempFilePath = path.join(PROXY_DIR, '.ingest-metadata.tmp.json');
      expect(fs.existsSync(tempFilePath)).toBe(false);

      // Original file should exist
      expect(fs.existsSync(jsonPath)).toBe(true);
    });

    it('should remove old file before renaming temp file', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "kitchen" };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      // File should still exist with updated content
      expect(fs.existsSync(jsonPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      expect(content.EAV0TEST1.location).toBe('kitchen');
    });
  });

  describe('Error Handling', () => {
    it('should return "false" for malformed JSON', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      fs.writeFileSync(jsonPath, '{ invalid json }');

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "kitchen" };

      const result = writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      expect(result).toBe('false');

      // Check error log
      const logs = $.getLogsByPrefix('ERROR writing JSON file');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle undefined updates gracefully', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "location": "kitchen"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = {
        location: "hallway",
        subject: undefined // Undefined should be ignored
      };

      const result = writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      expect(result).toBe('true');

      const updatedContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const clip = updatedContent.EAV0TEST1;

      expect(clip.location).toBe('hallway');
      expect(clip.subject).toBeUndefined();
    });
  });

  describe('Logging', () => {
    it('should log successful write', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "kitchen" };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      const logs = $.getLogsByPrefix('DEBUG JSON WRITE: Successfully wrote');
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('EAV0TEST1');
    });

    it('should log shotName and modifiedAt', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotNumber": 5
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = {
        location: "kitchen",
        subject: "oven",
        action: "cleaning",
        shotType: "ESTAB"
      };

      writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, $);

      const logs = $.logs;
      const shotNameLog = logs.find(log => log.includes('shotName:'));
      const modifiedAtLog = logs.find(log => log.includes('modifiedAt:'));

      expect(shotNameLog).toContain('kitchen-oven-cleaning-ESTAB-#5');
      expect(modifiedAtLog).toContain('2025-11-19T12:00:00.000Z');
    });

    it('should work without $ global (no logging)', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false
      };

      fs.writeFileSync(jsonPath, JSON.stringify(existingJSON));

      const jsonFile = new MockFile(jsonPath);
      const updates = { location: "kitchen" };

      const result = writeJSONToFile(jsonFile, 'EAV0TEST1.MOV', updates, null);

      expect(result).toBe('true');
    });
  });
});

describe('writeJSONMetadata()', () => {
  let $;

  beforeEach(() => {
    $ = new MockExtendScriptGlobal();

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

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-19T12:00:00Z'));
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    vi.useRealTimers();
  });

  describe('Priority 1: Proxy Folder', () => {
    it('should write to proxy folder when proxy attached', () => {
      const proxyJSONPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": { "id": "EAV0TEST1" }
      };

      fs.writeFileSync(proxyJSONPath, JSON.stringify(existingJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const updates = { location: "PROXY-FOLDER" };
      const result = writeJSONMetadata(clip, updates, MockFile, $);

      expect(result).toBe('true');

      // Check logs
      const logs = $.getLogsByPrefix('DEBUG JSON WRITE: Writing to proxy folder');
      expect(logs.length).toBe(1);

      // Verify file updated
      const updatedContent = JSON.parse(fs.readFileSync(proxyJSONPath, 'utf8'));
      expect(updatedContent.EAV0TEST1.location).toBe('PROXY-FOLDER');
    });

    it('should prefer proxy folder over raw folder', () => {
      const proxyJSONPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');

      const proxyJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": { "id": "EAV0TEST1", "location": "proxy" }
      };

      const rawJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": { "id": "EAV0TEST1", "location": "raw" }
      };

      fs.writeFileSync(proxyJSONPath, JSON.stringify(proxyJSON));
      fs.writeFileSync(rawJSONPath, JSON.stringify(rawJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const updates = { location: "UPDATED" };
      writeJSONMetadata(clip, updates, MockFile, $);

      // Proxy file should be updated
      const proxyContent = JSON.parse(fs.readFileSync(proxyJSONPath, 'utf8'));
      expect(proxyContent.EAV0TEST1.location).toBe('UPDATED');

      // Raw file should be unchanged
      const rawContent = JSON.parse(fs.readFileSync(rawJSONPath, 'utf8'));
      expect(rawContent.EAV0TEST1.location).toBe('raw');
    });
  });

  describe('Priority 2: Raw Media Folder Fallback', () => {
    it('should fallback to raw folder when no proxy', () => {
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": { "id": "EAV0TEST1" }
      };

      fs.writeFileSync(rawJSONPath, JSON.stringify(existingJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: '', // No proxy
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const updates = { location: "RAW-FOLDER" };
      const result = writeJSONMetadata(clip, updates, MockFile, $);

      expect(result).toBe('true');

      // Check logs
      const logs = $.getLogsByPrefix('DEBUG JSON WRITE: Writing to raw folder');
      expect(logs.length).toBe(1);

      // Verify file updated
      const updatedContent = JSON.parse(fs.readFileSync(rawJSONPath, 'utf8'));
      expect(updatedContent.EAV0TEST1.location).toBe('RAW-FOLDER');
    });

    it('should fallback to raw folder when proxy JSON missing', () => {
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');
      const existingJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": { "id": "EAV0TEST1" }
      };

      fs.writeFileSync(rawJSONPath, JSON.stringify(existingJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'), // Proxy exists but no JSON
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const updates = { location: "FALLBACK" };
      const result = writeJSONMetadata(clip, updates, MockFile, $);

      expect(result).toBe('true');

      const updatedContent = JSON.parse(fs.readFileSync(rawJSONPath, 'utf8'));
      expect(updatedContent.EAV0TEST1.location).toBe('FALLBACK');
    });
  });

  describe('Error Handling', () => {
    it('should return "false" when no JSON file found', () => {
      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const updates = { location: "kitchen" };
      const result = writeJSONMetadata(clip, updates, MockFile, $);

      expect(result).toBe('false');

      // Check error log
      const logs = $.getLogsByPrefix('ERROR: No .ingest-metadata.json found for writing');
      expect(logs.length).toBe(1);
    });

    it('should handle errors gracefully', () => {
      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: null, // Will cause error
        mediaPath: null
      });

      const updates = { location: "kitchen" };
      const result = writeJSONMetadata(clip, updates, MockFile, $);

      expect(result).toBe('false');

      // Check error log (no JSON file found, not an exception)
      const logs = $.getLogsByPrefix('ERROR: No .ingest-metadata.json found for writing');
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Schema 2.0 Compliance', () => {
    it('should write valid Schema 2.0 metadata', () => {
      const proxyJSONPath = path.join(PROXY_DIR, '.ingest-metadata.json');
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

      fs.writeFileSync(proxyJSONPath, JSON.stringify(existingJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const updates = {
        location: "kitchen",
        subject: "oven",
        action: "cleaning",
        shotType: "ESTAB",
        keywords: ["oven", "cleaning"]
      };

      const result = writeJSONMetadata(clip, updates, MockFile, $);

      expect(result).toBe('true');

      const updatedContent = JSON.parse(fs.readFileSync(proxyJSONPath, 'utf8'));
      const clipData = updatedContent.EAV0TEST1;

      // Schema 2.0 fields
      expect(clipData.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
      expect(clipData.location).toBe('kitchen');
      expect(clipData.subject).toBe('oven');
      expect(clipData.action).toBe('cleaning');
      expect(clipData.shotType).toBe('ESTAB');
      expect(clipData.keywords).toEqual(["oven", "cleaning"]);

      // Audit fields
      expect(clipData.modifiedAt).toBe('2025-11-19T12:00:00.000Z');
      expect(clipData.modifiedBy).toBe('cep-panel');
      expect(clipData.createdAt).toBe('2025-11-18T00:00:00Z'); // Preserved
      expect(clipData.createdBy).toBe('ingest-assistant'); // Preserved
    });
  });
});
