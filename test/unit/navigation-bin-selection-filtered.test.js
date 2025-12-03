// Navigation Panel: Bin Selection with Filter Tests
// Tests that toggleBinSelection respects active filter state

import { describe, it, expect, beforeEach } from 'vitest';

describe('Navigation Panel - Bin Selection Respects Filters', () => {
  let mockPanelState;
  let NavigationPanel;

  beforeEach(() => {
    // Mock PanelState
    mockPanelState = {
      allClips: [
        // Bin: shoot1-20251103 - 3 clips total
        {
          name: 'EA001601.MOV',  // Untagged
          nodeId: 'clip-1',
          treePath: '\\Project.prproj\\shoot1-20251103\\EA001601.MOV',
          mediaPath: '/path/EA001601.MOV'
        },
        {
          name: 'Location-Subject-Action-WS-#001',  // Tagged
          nodeId: 'clip-2',
          treePath: '\\Project.prproj\\shoot1-20251103\\EA001602.MOV',
          mediaPath: '/path/EA001602.MOV'
        },
        {
          name: 'EA001603.MOV',  // Untagged
          nodeId: 'clip-3',
          treePath: '\\Project.prproj\\shoot1-20251103\\EA001603.MOV',
          mediaPath: '/path/EA001603.MOV'
        },
        // Bin: shoot2-20251104 - 2 clips total
        {
          name: 'Location-Subject-Action-MS-#002',  // Tagged
          nodeId: 'clip-4',
          treePath: '\\Project.prproj\\shoot2-20251104\\EA001701.MOV',
          mediaPath: '/path/EA001701.MOV'
        },
        {
          name: 'EA001702.MOV',  // Untagged
          nodeId: 'clip-5',
          treePath: '\\Project.prproj\\shoot2-20251104\\EA001702.MOV',
          mediaPath: '/path/EA001702.MOV'
        }
      ],
      selectedClips: [],
      searchFilter: '',
      filterVideo: true,
      filterImage: true,
      filterTagged: 'all',  // Options: 'all', 'tagged', 'untagged'
      expandedBins: {}
    };

    // Mock NavigationPanel with required methods
    NavigationPanel = {
      getFilteredClips: function() {
        var search = mockPanelState.searchFilter.toLowerCase();

        return mockPanelState.allClips.filter(function(clip) {
          // Search filter
          if (search && clip.name.toLowerCase().indexOf(search) === -1) {
            return false;
          }

          // Type filters
          var isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
          var isImage = /\.(jpg|jpeg|png|tif|tiff)$/i.test(clip.mediaPath);

          if (isVideo && !mockPanelState.filterVideo) {return false;}
          if (isImage && !mockPanelState.filterImage) {return false;}

          // Tagged filter - uses structured naming pattern
          var hasStructuredName = clip.name && clip.name.indexOf('-') !== -1 &&
                                    clip.name.split('-').length >= 2 &&
                                    !clip.name.match(/^EA\d{6}/i);
          if (mockPanelState.filterTagged === 'tagged' && !hasStructuredName) {return false;}
          if (mockPanelState.filterTagged === 'untagged' && hasStructuredName) {return false;}

          return true;
        });
      },

      toggleBinSelection: function(binName) {
        // Get filtered clips first to respect active filters
        var filteredClips = this.getFilteredClips();

        // Find clips in this bin that are ALSO in the filtered set
        var binClips = filteredClips.filter(function(clip) {
          if (!clip.treePath) {
            return binName === 'Other';
          }

          var parts = clip.treePath.split('\\').filter(function(p) { return p.length > 0; });
          var clipBinName = parts.length >= 3 ? parts[1] : 'Other';
          return clipBinName === binName;
        });

        var binClipIds = binClips.map(function(clip) { return clip.nodeId; });

        // Check current selection state
        var selectedInBin = binClipIds.filter(function(id) {
          return mockPanelState.selectedClips.indexOf(id) !== -1;
        }).length;

        if (selectedInBin === binClipIds.length) {
          // All selected → deselect all
          binClipIds.forEach(function(id) {
            var index = mockPanelState.selectedClips.indexOf(id);
            if (index !== -1) {
              mockPanelState.selectedClips.splice(index, 1);
            }
          });
        } else {
          // Some or none selected → select all
          binClipIds.forEach(function(id) {
            if (mockPanelState.selectedClips.indexOf(id) === -1) {
              mockPanelState.selectedClips.push(id);
            }
          });
        }
      },

      render: function() {
        // No-op for tests
      }
    };
  });

  it('should select only FILTERED clips when bin checkbox is clicked', () => {
    // ARRANGE: Filter to show only UNTAGGED clips
    mockPanelState.filterTagged = 'untagged';

    // Verify filter is working: should return 3 untagged clips in shoot1-20251103
    var filteredClips = NavigationPanel.getFilteredClips();
    var filteredInBin = filteredClips.filter(function(clip) {
      return clip.treePath && clip.treePath.indexOf('shoot1-20251103') !== -1;
    });

    expect(filteredInBin.length).toBe(2); // EA001601.MOV, EA001603.MOV (not the tagged clip-2)

    // ACT: Toggle bin selection for shoot1-20251103
    NavigationPanel.toggleBinSelection('shoot1-20251103');

    // ASSERT: Should select ONLY the 2 FILTERED clips, NOT all 3 clips in bin
    expect(mockPanelState.selectedClips.length).toBe(2);
    expect(mockPanelState.selectedClips).toContain('clip-1'); // EA001601.MOV
    expect(mockPanelState.selectedClips).toContain('clip-3'); // EA001603.MOV
    expect(mockPanelState.selectedClips).not.toContain('clip-2'); // Tagged clip should NOT be selected
  });

  it('should select only TAGGED clips when filter is set to tagged', () => {
    // ARRANGE: Filter to show only TAGGED clips
    mockPanelState.filterTagged = 'tagged';

    // Verify filter: should return 1 tagged clip in shoot1-20251103
    var filteredClips = NavigationPanel.getFilteredClips();
    var filteredInBin = filteredClips.filter(function(clip) {
      return clip.treePath && clip.treePath.indexOf('shoot1-20251103') !== -1;
    });

    expect(filteredInBin.length).toBe(1); // Only clip-2 (Location-Subject-Action-WS-#001)

    // ACT: Toggle bin selection
    NavigationPanel.toggleBinSelection('shoot1-20251103');

    // ASSERT: Should select ONLY the 1 FILTERED clip
    expect(mockPanelState.selectedClips.length).toBe(1);
    expect(mockPanelState.selectedClips).toContain('clip-2'); // Tagged clip
    expect(mockPanelState.selectedClips).not.toContain('clip-1'); // Untagged should NOT be selected
    expect(mockPanelState.selectedClips).not.toContain('clip-3'); // Untagged should NOT be selected
  });

  it('should respect search filter when toggling bin selection', () => {
    // ARRANGE: Set search filter
    mockPanelState.searchFilter = 'EA001601';

    // Verify filter: should return 1 clip matching search
    var filteredClips = NavigationPanel.getFilteredClips();
    expect(filteredClips.length).toBe(1);
    expect(filteredClips[0].nodeId).toBe('clip-1');

    // ACT: Toggle bin selection
    NavigationPanel.toggleBinSelection('shoot1-20251103');

    // ASSERT: Should select ONLY the 1 clip matching search
    expect(mockPanelState.selectedClips.length).toBe(1);
    expect(mockPanelState.selectedClips).toContain('clip-1');
    expect(mockPanelState.selectedClips).not.toContain('clip-2');
    expect(mockPanelState.selectedClips).not.toContain('clip-3');
  });

  it('should deselect only FILTERED clips when all are already selected', () => {
    // ARRANGE: Filter to untagged, manually select all filtered clips
    mockPanelState.filterTagged = 'untagged';
    mockPanelState.selectedClips = ['clip-1', 'clip-3']; // Both untagged clips in bin

    // ACT: Toggle bin selection (should deselect)
    NavigationPanel.toggleBinSelection('shoot1-20251103');

    // ASSERT: Should deselect both filtered clips
    expect(mockPanelState.selectedClips.length).toBe(0);
  });
});
