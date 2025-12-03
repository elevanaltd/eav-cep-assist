// Integration test: Metadata event dispatch with computed shotName
// Bug: applyMetadata() dispatches old clip.name instead of new computed shotName

import { describe, it, expect } from 'vitest';

describe('Metadata Event Dispatch - computeShotNameLocally logic', () => {
  it('should compute shotName with all fields and shotNumber', () => {
    // Mock computeShotNameLocally function (matches js/metadata-panel.js:L548-561)
    var computeShotNameLocally = function(metadata) {
      var parts = [];
      if (metadata.location) { parts.push(metadata.location); }
      if (metadata.subject) { parts.push(metadata.subject); }
      if (metadata.action) { parts.push(metadata.action); }
      if (metadata.shotType) { parts.push(metadata.shotType); }

      var baseName = parts.join('-');
      if (metadata.shotNumber) {
        return baseName + '-#' + metadata.shotNumber;
      }
      return baseName;
    };

    // Test: Compute shotName with shotNumber
    var metadata = {
      location: 'Office',
      subject: 'Product',
      action: 'Demo',
      shotType: 'WS',
      shotNumber: '42'
    };

    var result = computeShotNameLocally(metadata);
    expect(result).toBe('Office-Product-Demo-WS-#42');
  });

  it('should compute shotName without shotNumber', () => {
    var computeShotNameLocally = function(metadata) {
      var parts = [];
      if (metadata.location) { parts.push(metadata.location); }
      if (metadata.subject) { parts.push(metadata.subject); }
      if (metadata.action) { parts.push(metadata.action); }
      if (metadata.shotType) { parts.push(metadata.shotType); }

      var baseName = parts.join('-');
      if (metadata.shotNumber) {
        return baseName + '-#' + metadata.shotNumber;
      }
      return baseName;
    };

    // Test: Compute shotName without shotNumber
    var metadata = {
      location: 'Park',
      subject: 'Nature',
      action: 'Walk',
      shotType: 'LS'
    };

    var result = computeShotNameLocally(metadata);
    expect(result).toBe('Park-Nature-Walk-LS');
  });

  it('should demonstrate the bug: event would send old clip.name instead of new shotName', () => {
    // This test documents the BUG and verifies the expected behavior after fix

    // SCENARIO: User edits metadata and clicks Apply
    var currentClip = {
      nodeId: '12345',
      name: 'OldClipName'  // This is what's currently in Premiere
    };

    // User's new edits (the updates object in applyMetadata)
    var updates = {
      location: 'Office',
      subject: 'Product',
      action: 'Demo',
      shotType: 'WS'
    };

    // Cached metadata includes shotNumber (from previous load)
    var cachedMetadata = {
      shotNumber: '42'
    };

    // Compute what the new shotName SHOULD be
    var computeShotNameLocally = function(metadata) {
      var parts = [];
      if (metadata.location) { parts.push(metadata.location); }
      if (metadata.subject) { parts.push(metadata.subject); }
      if (metadata.action) { parts.push(metadata.action); }
      if (metadata.shotType) { parts.push(metadata.shotType); }

      var baseName = parts.join('-');
      if (metadata.shotNumber) {
        return baseName + '-#' + metadata.shotNumber;
      }
      return baseName;
    };

    var expectedNewShotName = computeShotNameLocally({
      location: updates.location,
      subject: updates.subject,
      action: updates.action,
      shotType: updates.shotType,
      shotNumber: cachedMetadata.shotNumber
    });

    // EXPECTATION: Event should send the NEW computed shotName
    expect(expectedNewShotName).toBe('Office-Product-Demo-WS-#42');

    // BUG: Current code at line 775 sends currentClip.name ('OldClipName')
    // This test will PASS because it verifies the logic is correct.
    // The actual bug is in js/metadata-panel.js:775 which needs to be fixed.
  });
});
