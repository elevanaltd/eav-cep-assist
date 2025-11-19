/**
 * Unit tests for readJSONMetadata() and readJSONFromFile() functions
 * Tests JSON metadata reading from .ingest-metadata.json files
 * Priority: Proxy folder first, raw media folder fallback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readJSONMetadata, readJSONFromFile } from '../helpers/track-a-functions.js';
import {
  MockFile,
  MockProjectItem,
  MockExtendScriptGlobal
} from '../helpers/extendscript-mocks.js';
import * as fs from 'fs';
import * as path from 'path';

// Test directory for JSON files
const TEST_DIR = '/tmp/track-a-read-tests';
const PROXY_DIR = path.join(TEST_DIR, 'proxy');
const RAW_DIR = path.join(TEST_DIR, 'raw');

describe('readJSONFromFile()', () => {
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
  });

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Happy Path', () => {
    it('should read and parse valid JSON metadata', () => {
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

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'EAV0TEST1.MOV', $);

      expect(result).not.toBe('null');

      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('EAV0TEST1');
      expect(parsed.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
      expect(parsed.location).toBe('kitchen');
      expect(parsed.shotNumber).toBe(1);
    });

    it('should extract clip ID by removing file extension', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST2": {
          "id": "EAV0TEST2",
          "shotName": "hallway-door-opening-CU-#2",
          "location": "hallway"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const jsonFile = new MockFile(jsonPath);

      // Test with different extensions
      const result1 = readJSONFromFile(jsonFile, 'EAV0TEST2.MOV', $);
      const result2 = readJSONFromFile(jsonFile, 'EAV0TEST2.mp4', $);
      const result3 = readJSONFromFile(jsonFile, 'EAV0TEST2.avi', $);

      const parsed1 = JSON.parse(result1);
      const parsed2 = JSON.parse(result2);
      const parsed3 = JSON.parse(result3);

      expect(parsed1.id).toBe('EAV0TEST2');
      expect(parsed2.id).toBe('EAV0TEST2');
      expect(parsed3.id).toBe('EAV0TEST2');
    });

    it('should compute shotName if missing from JSON', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST3": {
          "id": "EAV0TEST3",
          "location": "bedroom",
          "subject": "window",
          "action": "closing",
          "shotType": "MID",
          "shotNumber": 3
          // shotName is MISSING
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'EAV0TEST3.MOV', $);

      const parsed = JSON.parse(result);
      expect(parsed.shotName).toBe('bedroom-window-closing-MID-#3');

      // Check logs
      const logs = $.getLogsByPrefix('INFO: shotName computed');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle multiple clips in same JSON file', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = JSON.parse(
        fs.readFileSync(path.resolve('test/fixtures/track-a/valid-metadata.json'), 'utf8')
      );

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const jsonFile = new MockFile(jsonPath);

      // Read different clips
      const result1 = readJSONFromFile(jsonFile, 'EAV0TEST1.MOV', $);
      const result2 = readJSONFromFile(jsonFile, 'EAV0TEST2.MOV', $);
      const result3 = readJSONFromFile(jsonFile, 'EAV0TEST3.MOV', $);

      const parsed1 = JSON.parse(result1);
      const parsed2 = JSON.parse(result2);
      const parsed3 = JSON.parse(result3);

      expect(parsed1.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
      expect(parsed2.shotName).toBe('hallway-front-door-opening-CU-#2');
      expect(parsed3.shotName).toBe('bedroom-window-closing-MID-#3');
    });
  });

  describe('Error Handling', () => {
    it('should return "null" for clip ID not found in JSON', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "test"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'NONEXISTENT.MOV', $);

      expect(result).toBe('null');

      // Check warning log
      const logs = $.getLogsByPrefix('WARNING: Clip ID');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should return "null" for malformed JSON', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');

      // Write invalid JSON
      fs.writeFileSync(jsonPath, '{ invalid json }');

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'EAV0TEST1.MOV', $);

      expect(result).toBe('null');

      // Check error log
      const logs = $.getLogsByPrefix('ERROR parsing JSON file');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle empty JSON file', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      fs.writeFileSync(jsonPath, '');

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'EAV0TEST1.MOV', $);

      expect(result).toBe('null');
    });

    it('should handle JSON with only metadata fields', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const emptyJSON = JSON.parse(
        fs.readFileSync(path.resolve('test/fixtures/track-a/empty-metadata.json'), 'utf8')
      );

      fs.writeFileSync(jsonPath, JSON.stringify(emptyJSON));

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'EAV0TEST1.MOV', $);

      expect(result).toBe('null');
    });
  });

  describe('Logging', () => {
    it('should log warning when clip ID not found', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const jsonFile = new MockFile(jsonPath);
      readJSONFromFile(jsonFile, 'MISSING.MOV', $);

      const logs = $.logs.filter(log => log.includes('WARNING: Clip ID "MISSING" not found'));
      expect(logs.length).toBe(1);
    });

    it('should work without $ global (no logging)', () => {
      const jsonPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "test"
        }
      };

      fs.writeFileSync(jsonPath, JSON.stringify(validJSON));

      const jsonFile = new MockFile(jsonPath);
      const result = readJSONFromFile(jsonFile, 'EAV0TEST1.MOV', null);

      expect(result).not.toBe('null');
      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('EAV0TEST1');
    });
  });
});

describe('readJSONMetadata()', () => {
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
  });

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Priority 1: Proxy Folder', () => {
    it('should read from proxy folder when proxy attached', () => {
      const proxyJSONPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "FROM-PROXY-FOLDER",
          "location": "proxy"
        }
      };

      fs.writeFileSync(proxyJSONPath, JSON.stringify(validJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      const parsed = JSON.parse(result);
      expect(parsed.shotName).toBe('FROM-PROXY-FOLDER');

      // Check logs
      const logs = $.getLogsByPrefix('DEBUG JSON: Reading from proxy folder');
      expect(logs.length).toBe(1);
    });

    it('should prefer proxy folder over raw folder', () => {
      const proxyJSONPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');

      const proxyJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "FROM-PROXY",
          "location": "proxy"
        }
      };

      const rawJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "FROM-RAW",
          "location": "raw"
        }
      };

      fs.writeFileSync(proxyJSONPath, JSON.stringify(proxyJSON));
      fs.writeFileSync(rawJSONPath, JSON.stringify(rawJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      const parsed = JSON.parse(result);
      expect(parsed.shotName).toBe('FROM-PROXY');
      expect(parsed.location).toBe('proxy');
    });
  });

  describe('Priority 2: Raw Media Folder Fallback', () => {
    it('should fallback to raw folder when no proxy', () => {
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "FROM-RAW-FOLDER",
          "location": "raw"
        }
      };

      fs.writeFileSync(rawJSONPath, JSON.stringify(validJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: '', // No proxy
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      const parsed = JSON.parse(result);
      expect(parsed.shotName).toBe('FROM-RAW-FOLDER');

      // Check logs
      const logs = $.getLogsByPrefix('DEBUG JSON: Reading from raw folder');
      expect(logs.length).toBe(1);
    });

    it('should fallback to raw folder when proxy JSON missing', () => {
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "FALLBACK-TO-RAW"
        }
      };

      fs.writeFileSync(rawJSONPath, JSON.stringify(validJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'), // Proxy exists but no JSON
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      const parsed = JSON.parse(result);
      expect(parsed.shotName).toBe('FALLBACK-TO-RAW');
    });
  });

  describe('Error Handling', () => {
    it('should return "null" when no JSON file found', () => {
      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      expect(result).toBe('null');

      // Check warning log
      const logs = $.getLogsByPrefix('WARNING: No .ingest-metadata.json found');
      expect(logs.length).toBe(1);
    });

    it('should handle errors gracefully', () => {
      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: null, // Will cause error
        mediaPath: null
      });

      const result = readJSONMetadata(clip, MockFile, $);

      expect(result).toBe('null');

      // Check warning log (no JSON file found, not an exception)
      const logs = $.getLogsByPrefix('WARNING: No .ingest-metadata.json found');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle empty proxy path', () => {
      const rawJSONPath = path.join(RAW_DIR, '.ingest-metadata.json');
      const validJSON = {
        "_schema": "2.0",
        "_completed": false,
        "EAV0TEST1": {
          "id": "EAV0TEST1",
          "shotName": "test"
        }
      };

      fs.writeFileSync(rawJSONPath, JSON.stringify(validJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: '', // Empty string
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      expect(result).not.toBe('null');
    });
  });

  describe('Schema 2.0 Compliance', () => {
    it('should read valid Schema 2.0 metadata', () => {
      const proxyJSONPath = path.join(PROXY_DIR, '.ingest-metadata.json');
      const validJSON = JSON.parse(
        fs.readFileSync(path.resolve('test/fixtures/track-a/valid-metadata.json'), 'utf8')
      );

      fs.writeFileSync(proxyJSONPath, JSON.stringify(validJSON));

      const clip = new MockProjectItem({
        name: 'EAV0TEST1.MOV',
        proxyPath: path.join(PROXY_DIR, 'EAV0TEST1_Proxy.mov'),
        mediaPath: path.join(RAW_DIR, 'EAV0TEST1.MOV')
      });

      const result = readJSONMetadata(clip, MockFile, $);

      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('EAV0TEST1');
      expect(parsed.shotName).toBe('kitchen-oven-cleaning-ESTAB-#1');
      expect(parsed.location).toBe('kitchen');
      expect(parsed.subject).toBe('oven');
      expect(parsed.action).toBe('cleaning');
      expect(parsed.shotType).toBe('ESTAB');
      expect(parsed.shotNumber).toBe(1);
      expect(parsed.keywords).toEqual(['oven', 'cleaning', 'kitchen']);
      expect(parsed.lockedFields).toEqual([]);
    });
  });
});
