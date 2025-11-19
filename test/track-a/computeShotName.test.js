/**
 * Unit tests for computeShotName() function
 * Tests the shot name generation from metadata components
 * Format: {location}-{subject}-{action}-{shotType}-#{shotNumber}
 */

import { describe, it, expect } from 'vitest';
import { computeShotName } from '../helpers/track-a-functions.js';

describe('computeShotName()', () => {
  describe('Happy Path', () => {
    it('should generate full shotName with all fields and shot number', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen-oven-cleaning-ESTAB-#1');
    });

    it('should generate shotName with double-digit shot number', () => {
      const metadata = {
        location: 'hallway',
        subject: 'front-door',
        action: 'opening',
        shotType: 'CU',
        shotNumber: 25
      };

      const result = computeShotName(metadata);

      expect(result).toBe('hallway-front-door-opening-CU-#25');
    });

    it('should generate shotName with hyphenated subject', () => {
      const metadata = {
        location: 'bedroom',
        subject: 'night-stand',
        action: 'dusting',
        shotType: 'MCU',
        shotNumber: 3
      };

      const result = computeShotName(metadata);

      expect(result).toBe('bedroom-night-stand-dusting-MCU-#3');
    });

    it('should generate shotName without shot number if missing', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB'
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen-oven-cleaning-ESTAB');
    });

    it('should generate shotName with zero shot number', () => {
      const metadata = {
        location: 'garage',
        subject: 'car',
        action: 'parking',
        shotType: 'WS',
        shotNumber: 0
      };

      const result = computeShotName(metadata);

      // shotNumber 0 is falsy, so no #0 appended
      expect(result).toBe('garage-car-parking-WS');
    });
  });

  describe('Partial Metadata', () => {
    it('should handle missing location', () => {
      const metadata = {
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('oven-cleaning-ESTAB-#1');
    });

    it('should handle missing subject', () => {
      const metadata = {
        location: 'kitchen',
        action: 'cleaning',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen-cleaning-ESTAB-#1');
    });

    it('should handle missing action', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen-oven-ESTAB-#1');
    });

    it('should handle missing shotType', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen-oven-cleaning-#1');
    });

    it('should handle only location', () => {
      const metadata = {
        location: 'kitchen'
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen');
    });

    it('should handle only shotType and shotNumber', () => {
      const metadata = {
        shotType: 'ESTAB',
        shotNumber: 5
      };

      const result = computeShotName(metadata);

      expect(result).toBe('ESTAB-#5');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty string for null metadata', () => {
      const result = computeShotName(null);

      expect(result).toBe('');
    });

    it('should return empty string for undefined metadata', () => {
      const result = computeShotName(undefined);

      expect(result).toBe('');
    });

    it('should return empty string for empty object', () => {
      const metadata = {};

      const result = computeShotName(metadata);

      expect(result).toBe('');
    });

    it('should handle empty strings in fields', () => {
      const metadata = {
        location: '',
        subject: 'oven',
        action: '',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      // Empty strings should be filtered out
      expect(result).toBe('oven-ESTAB-#1');
    });

    it('should handle whitespace-only fields', () => {
      const metadata = {
        location: '   ',
        subject: 'oven',
        action: '  ',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      // Whitespace strings are truthy, so they're included
      expect(result).toBe('   -oven-  -ESTAB-#1');
    });

    it('should handle special characters in fields', () => {
      const metadata = {
        location: 'kitchen/dining',
        subject: 'oven & stove',
        action: 'cleaning (deep)',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen/dining-oven & stove-cleaning (deep)-ESTAB-#1');
    });
  });

  describe('Shot Type Validation', () => {
    it('should handle ESTAB shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-ESTAB-#1');
    });

    it('should handle CU shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'CU',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-CU-#1');
    });

    it('should handle MCU shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'MCU',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-MCU-#1');
    });

    it('should handle MS shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'MS',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-MS-#1');
    });

    it('should handle WS shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-WS-#1');
    });

    it('should handle MID shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'MID',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-MID-#1');
    });

    it('should handle ECU shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ECU',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-ECU-#1');
    });

    it('should handle OTS shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'OTS',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-OTS-#1');
    });

    it('should handle INSERT shot type', () => {
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'INSERT',
        shotNumber: 1
      };

      expect(computeShotName(metadata)).toBe('kitchen-oven-cleaning-INSERT-#1');
    });
  });

  describe('Schema 2.0 Compliance', () => {
    it('should match format from Schema 2.0 documentation', () => {
      // Example from .coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md
      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'MID',
        shotNumber: 3
      };

      const result = computeShotName(metadata);

      expect(result).toBe('kitchen-oven-cleaning-MID-#3');
    });

    it('should match another Schema 2.0 example', () => {
      const metadata = {
        location: 'hallway',
        subject: 'front-door',
        action: 'safety-chain',
        shotType: 'CU',
        shotNumber: 1
      };

      const result = computeShotName(metadata);

      expect(result).toBe('hallway-front-door-safety-chain-CU-#1');
    });
  });
});
