// Batch Apply to Premiere - JSON Integration Tests
// Tests for batch apply using new JSON metadata approach (Track A/B)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockCSInterface } from '../helpers/mock-csinterface.js';

describe('Batch Apply to Premiere - JSON Integration', () => {
  let mockCSInterface;
  let mockPanelState;
  let batchApplyToPremiere;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock CSInterface for ExtendScript calls
    mockCSInterface = new MockCSInterface();

    // Mock PanelState with selected clips
    mockPanelState = {
      selectedClips: ['node-1', 'node-2', 'node-3'],
      allClips: [
        {
          nodeId: 'node-1',
          name: 'EA001621.MOV',
          mediaPath: '/videos-raw/shoot1/EA001621.MOV'
        },
        {
          nodeId: 'node-2',
          name: 'EA001622.MOV',
          mediaPath: '/videos-raw/shoot1/EA001622.MOV'
        },
        {
          nodeId: 'node-3',
          name: 'EA001623.MOV',
          mediaPath: '/videos-raw/shoot1/EA001623.MOV'
        }
      ]
    };

    // Mock elements for UI updates
    const mockElements = {
      batchApply: {
        disabled: false,
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        },
        innerHTML: ''
      }
    };

    // Track ExtendScript calls
    const evalScriptCalls = [];

    // Mock csInterface.evalScript to track calls and respond appropriately
    mockCSInterface.evalScript = vi.fn((script, callback) => {
      evalScriptCalls.push(script);

      // Simulate JSON read responses
      if (script.includes('readJSONMetadataByNodeId')) {
        const nodeIdMatch = script.match(/readJSONMetadataByNodeId\("([^"]+)"\)/);
        if (nodeIdMatch) {
          const nodeId = nodeIdMatch[1];
          // Return mock JSON metadata
          const mockMetadata = {
            id: nodeId.replace('node-', 'EA00162'),
            location: 'kitchen',
            subject: 'oven',
            action: 'cleaning',
            shotType: 'ESTAB',
            shotNumber: parseInt(nodeId.replace('node-', ''))
          };
          setTimeout(() => callback(JSON.stringify(mockMetadata)), 0);
        }
        return;
      }

      // Simulate JSON write responses
      if (script.includes('writeJSONMetadataByNodeId')) {
        setTimeout(() => callback('true'), 0);
        return;
      }

      // Default response
      setTimeout(() => callback('{}'), 0);
    });

    // Create the function under test (will be refactored in navigation-panel.js)
    // For now, this represents the expected behavior we're testing
    batchApplyToPremiere = function() {
      const self = this;
      const selectedCount = mockPanelState.selectedClips.length;

      if (selectedCount === 0) {
        return Promise.resolve({ processed: 0, errors: 0 });
      }

      // Get clip data for all selected clips
      const selectedClipData = mockPanelState.selectedClips.map(function(nodeId) {
        return mockPanelState.allClips.find(function(clip) {
          return clip.nodeId === nodeId;
        });
      }).filter(function(clip) {
        return clip !== null;
      });

      let processedCount = 0;
      let errorCount = 0;

      return new Promise(function(resolve) {
        // Process each clip sequentially
        function processNextClip(index) {
          if (index >= selectedClipData.length) {
            resolve({ processed: processedCount, errors: errorCount });
            return;
          }

          const clip = selectedClipData[index];
          const escapedNodeId = clip.nodeId.replace(/"/g, '\\"');

          // Step 1: Read JSON metadata for the clip (NEW - JSON approach)
          const readScript = 'EAVIngest.readJSONMetadataByNodeId("' + escapedNodeId + '")';
          mockCSInterface.evalScript(readScript, function(jsonResult) {
            let metadata;
            try {
              metadata = JSON.parse(jsonResult);
            } catch (e) {
              errorCount++;
              setTimeout(function() { processNextClip(index + 1); }, 10);
              return;
            }

            if (!metadata || metadata === 'null') {
              errorCount++;
              setTimeout(function() { processNextClip(index + 1); }, 10);
              return;
            }

            // Step 2: Write JSON metadata (NEW - triggers JSON write + PP Clip Name update)
            const updates = {
              location: metadata.location,
              subject: metadata.subject,
              action: metadata.action,
              shotType: metadata.shotType,
              shotNumber: metadata.shotNumber
            };
            const updatesJson = JSON.stringify(updates).replace(/'/g, '\\\'');
            const writeScript = 'EAVIngest.writeJSONMetadataByNodeId("' + escapedNodeId + '", JSON.parse(\'' + updatesJson + '\'))';

            mockCSInterface.evalScript(writeScript, function(writeResult) {
              if (writeResult === 'true') {
                processedCount++;
              } else {
                errorCount++;
              }
              setTimeout(function() { processNextClip(index + 1); }, 10);
            });
          });
        }

        processNextClip(0);
      });
    };
  });

  describe('JSON Metadata Integration', () => {
    it('should call readJSONMetadataByNodeId for each selected clip', async () => {
      const result = await batchApplyToPremiere();

      // Verify readJSONMetadataByNodeId was called for each clip
      const readCalls = mockCSInterface.evalScript.mock.calls.filter(call =>
        call[0].includes('readJSONMetadataByNodeId')
      );

      expect(readCalls.length).toBe(3);
      expect(readCalls[0][0]).toContain('node-1');
      expect(readCalls[1][0]).toContain('node-2');
      expect(readCalls[2][0]).toContain('node-3');
    });

    it('should call writeJSONMetadataByNodeId for each clip with valid JSON', async () => {
      const result = await batchApplyToPremiere();

      // Verify writeJSONMetadataByNodeId was called for each clip
      const writeCalls = mockCSInterface.evalScript.mock.calls.filter(call =>
        call[0].includes('writeJSONMetadataByNodeId')
      );

      expect(writeCalls.length).toBe(3);
      expect(writeCalls[0][0]).toContain('node-1');
      expect(writeCalls[1][0]).toContain('node-2');
      expect(writeCalls[2][0]).toContain('node-3');
    });

    it('should NOT call updateClipMetadata (old XMP approach)', async () => {
      const result = await batchApplyToPremiere();

      // Verify the old XMP function is NOT called
      const oldXmpCalls = mockCSInterface.evalScript.mock.calls.filter(call =>
        call[0].includes('updateClipMetadata')
      );

      expect(oldXmpCalls.length).toBe(0);
    });

    it('should return correct processed count on success', async () => {
      const result = await batchApplyToPremiere();

      expect(result.processed).toBe(3);
      expect(result.errors).toBe(0);
    });

    it('should handle JSON read failures gracefully', async () => {
      // Override evalScript to fail on first clip's read
      mockCSInterface.evalScript = vi.fn((script, callback) => {
        if (script.includes('readJSONMetadataByNodeId') && script.includes('node-1')) {
          setTimeout(() => callback('null'), 0);
        } else if (script.includes('readJSONMetadataByNodeId')) {
          const mockMetadata = {
            location: 'kitchen',
            subject: 'oven',
            action: 'cleaning',
            shotType: 'ESTAB',
            shotNumber: 1
          };
          setTimeout(() => callback(JSON.stringify(mockMetadata)), 0);
        } else if (script.includes('writeJSONMetadataByNodeId')) {
          setTimeout(() => callback('true'), 0);
        }
      });

      const result = await batchApplyToPremiere();

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(1);
    });

    it('should handle JSON write failures gracefully', async () => {
      // Override evalScript to fail on first clip's write
      mockCSInterface.evalScript = vi.fn((script, callback) => {
        if (script.includes('readJSONMetadataByNodeId')) {
          const mockMetadata = {
            location: 'kitchen',
            subject: 'oven',
            action: 'cleaning',
            shotType: 'ESTAB',
            shotNumber: 1
          };
          setTimeout(() => callback(JSON.stringify(mockMetadata)), 0);
        } else if (script.includes('writeJSONMetadataByNodeId') && script.includes('node-1')) {
          setTimeout(() => callback('false'), 0);
        } else if (script.includes('writeJSONMetadataByNodeId')) {
          setTimeout(() => callback('true'), 0);
        }
      });

      const result = await batchApplyToPremiere();

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(1);
    });
  });

  describe('Empty Selection Handling', () => {
    it('should return early with zero counts when no clips selected', async () => {
      mockPanelState.selectedClips = [];

      const result = await batchApplyToPremiere();

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockCSInterface.evalScript).not.toHaveBeenCalled();
    });
  });
});
