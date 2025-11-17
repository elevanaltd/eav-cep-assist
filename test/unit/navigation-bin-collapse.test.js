// Navigation Panel: Bin Expand/Collapse Tests
// Tests for bin grouping with collapsible folders

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Navigation Panel - Bin Expand/Collapse', () => {
  let mockPanelState;
  let mockClips;
  let groupByBin;
  let renderBinHeader;

  beforeEach(() => {
    // Mock PanelState structure
    mockPanelState = {
      allClips: [],
      currentClip: null,
      currentClipIndex: -1,
      searchFilter: '',
      filterVideo: true,
      filterImage: true,
      filterHasMeta: false,
      sortBy: 'bin',
      selectedClips: [],
      expandedBins: {} // NEW: Track expanded state (empty = all collapsed)
    };

    // Mock clip data with different bins
    mockClips = [
      {
        name: 'EA001601.MOV',
        nodeId: 'clip-1',
        treePath: '\\Project.prproj\\shoot1-20251103\\EA001601.MOV',
        mediaPath: '/path/EA001601.MOV'
      },
      {
        name: 'EA001602.MOV',
        nodeId: 'clip-2',
        treePath: '\\Project.prproj\\shoot1-20251103\\EA001602.MOV',
        mediaPath: '/path/EA001602.MOV'
      },
      {
        name: 'EA001701.MOV',
        nodeId: 'clip-3',
        treePath: '\\Project.prproj\\shoot2-20251104\\EA001701.MOV',
        mediaPath: '/path/EA001701.MOV'
      },
      {
        name: 'stock-01.jpg',
        nodeId: 'clip-4',
        treePath: '\\Project.prproj\\Stock\\stock-01.jpg',
        mediaPath: '/path/stock-01.jpg'
      }
    ];

    // Mock groupByBin function (will be implemented in actual code)
    groupByBin = function(clips, expandedBins) {
      const grouped = {};

      // Handle undefined expandedBins
      if (!expandedBins) {
        expandedBins = {};
      }

      clips.forEach(function(clip) {
        let binName = 'Other';

        if (clip.treePath) {
          let parts = clip.treePath.split('\\');
          parts = parts.filter(function(p) { return p.length > 0; });

          if (parts.length >= 3) {
            binName = parts[1];
          }
        }

        if (!grouped[binName]) {
          grouped[binName] = [];
        }
        grouped[binName].push(clip);
      });

      const sortedBinNames = Object.keys(grouped).sort();
      const result = [];

      sortedBinNames.forEach(function(binName) {
        const binClips = grouped[binName];

        // Add bin header
        result.push({
          isBinHeader: true,
          binPath: binName,
          isExpanded: expandedBins[binName] === true,
          clipCount: binClips.length  // NEW: Include clip count
        });

        // Only add clips if bin is expanded
        if (expandedBins[binName] === true) {
          binClips.sort(function(a, b) {
            return a.name.localeCompare(b.name);
          });

          binClips.forEach(function(clip) {
            result.push(clip);
          });
        }
      });

      return result;
    };

    // Mock bin header rendering (HTML generation)
    renderBinHeader = function(binPath, isExpanded, clipCount) {
      const arrow = isExpanded ? '▼' : '►';
      const displayName = binPath + (clipCount !== undefined ? ' (' + clipCount + ')' : '');
      return '<div class="bin-header' + (isExpanded ? '' : ' collapsed') + '" data-bin-path="' + binPath + '">' +
        arrow + ' ' + displayName +
        '</div>';
    };
  });

  describe('State Management', () => {
    it('should initialize with empty expandedBins (all collapsed)', () => {
      expect(mockPanelState.expandedBins).toEqual({});
    });

    it('should track expanded state per bin', () => {
      mockPanelState.expandedBins['shoot1-20251103'] = true;
      mockPanelState.expandedBins['shoot2-20251104'] = false;

      expect(mockPanelState.expandedBins['shoot1-20251103']).toBe(true);
      expect(mockPanelState.expandedBins['shoot2-20251104']).toBe(false);
      expect(mockPanelState.expandedBins['Stock']).toBeUndefined(); // Not set = collapsed
    });
  });

  describe('groupByBin() with Collapse Logic', () => {
    it('should return only bin headers when all bins collapsed', () => {
      const result = groupByBin(mockClips, {});

      // Should have 3 bin headers
      const headers = result.filter(item => item.isBinHeader);
      expect(headers).toHaveLength(3);
      expect(headers[0].binPath).toBe('Stock');
      expect(headers[1].binPath).toBe('shoot1-20251103');
      expect(headers[2].binPath).toBe('shoot2-20251104');

      // Should have NO clips (all collapsed)
      const clips = result.filter(item => !item.isBinHeader);
      expect(clips).toHaveLength(0);
    });

    it('should show clips only for expanded bins', () => {
      const expandedBins = {
        'shoot1-20251103': true,
        'shoot2-20251104': false,
        'Stock': false
      };

      const result = groupByBin(mockClips, expandedBins);

      // Should have 3 bin headers
      const headers = result.filter(item => item.isBinHeader);
      expect(headers).toHaveLength(3);

      // Should have only 2 clips (from shoot1-20251103)
      const clips = result.filter(item => !item.isBinHeader);
      expect(clips).toHaveLength(2);
      expect(clips[0].name).toBe('EA001601.MOV');
      expect(clips[1].name).toBe('EA001602.MOV');
    });

    it('should show all clips when all bins expanded', () => {
      const expandedBins = {
        'shoot1-20251103': true,
        'shoot2-20251104': true,
        'Stock': true
      };

      const result = groupByBin(mockClips, expandedBins);

      // Should have 3 bin headers + 4 clips
      const headers = result.filter(item => item.isBinHeader);
      const clips = result.filter(item => !item.isBinHeader);

      expect(headers).toHaveLength(3);
      expect(clips).toHaveLength(4);
    });

    it('should mark bin headers with expanded state', () => {
      const expandedBins = {
        'shoot1-20251103': true,
        'shoot2-20251104': false
      };

      const result = groupByBin(mockClips, expandedBins);
      const headers = result.filter(item => item.isBinHeader);

      expect(headers[1].binPath).toBe('shoot1-20251103');
      expect(headers[1].isExpanded).toBe(true);

      expect(headers[2].binPath).toBe('shoot2-20251104');
      expect(headers[2].isExpanded).toBe(false);
    });
  });

  describe('Bin Header Rendering', () => {
    it('should show ▼ arrow for expanded bins', () => {
      const html = renderBinHeader('shoot1-20251103', true);
      expect(html).toContain('▼');
      expect(html).not.toContain('collapsed');
    });

    it('should show ► arrow for collapsed bins', () => {
      const html = renderBinHeader('shoot1-20251103', false);
      expect(html).toContain('►');
      expect(html).toContain('collapsed');
    });

    it('should include bin path in data attribute', () => {
      const html = renderBinHeader('shoot1-20251103', true);
      expect(html).toContain('data-bin-path="shoot1-20251103"');
    });
  });

  describe('Toggle Behavior', () => {
    it('should toggle bin from collapsed to expanded', () => {
      const binName = 'shoot1-20251103';

      // Start collapsed (undefined)
      expect(mockPanelState.expandedBins[binName]).toBeUndefined();

      // Toggle to expanded (explicit: undefined/false → true)
      const currentState = mockPanelState.expandedBins[binName] || false;
      mockPanelState.expandedBins[binName] = !currentState;
      expect(mockPanelState.expandedBins[binName]).toBe(true);
    });

    it('should toggle bin from expanded to collapsed', () => {
      const binName = 'shoot1-20251103';

      // Start expanded
      mockPanelState.expandedBins[binName] = true;
      expect(mockPanelState.expandedBins[binName]).toBe(true);

      // Toggle to collapsed (explicit: true → false)
      const currentState = mockPanelState.expandedBins[binName] || false;
      mockPanelState.expandedBins[binName] = !currentState;
      expect(mockPanelState.expandedBins[binName]).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle clips with no bin (treePath missing)', () => {
      const clipsNoBin = [
        {
          name: 'orphan.mov',
          nodeId: 'clip-orphan',
          treePath: null,
          mediaPath: '/path/orphan.mov'
        }
      ];

      const result = groupByBin(clipsNoBin, {});

      // Should create "Other" bin
      const headers = result.filter(item => item.isBinHeader);
      expect(headers).toHaveLength(1);
      expect(headers[0].binPath).toBe('Other');

      // Clips should NOT show (collapsed by default)
      const clips = result.filter(item => !item.isBinHeader);
      expect(clips).toHaveLength(0);
    });

    it('should handle empty clip list', () => {
      const result = groupByBin([], {});
      expect(result).toHaveLength(0);
    });

    it('should handle undefined expandedBins state', () => {
      const result = groupByBin(mockClips, undefined);

      // Should treat undefined as empty object (all collapsed)
      const clips = result.filter(item => !item.isBinHeader);
      expect(clips).toHaveLength(0);
    });
  });

  describe('Bin Clip Count', () => {
    it('should include clip count in bin header', () => {
      const result = groupByBin(mockClips, {});
      const headers = result.filter(item => item.isBinHeader);

      // Check each bin has clipCount property
      expect(headers[0].binPath).toBe('Stock');
      expect(headers[0].clipCount).toBe(1);

      expect(headers[1].binPath).toBe('shoot1-20251103');
      expect(headers[1].clipCount).toBe(2);

      expect(headers[2].binPath).toBe('shoot2-20251104');
      expect(headers[2].clipCount).toBe(1);
    });

    it('should show clip count even when bin is collapsed', () => {
      const result = groupByBin(mockClips, {}); // All collapsed

      const header = result.find(item => item.isBinHeader && item.binPath === 'shoot1-20251103');
      expect(header.isExpanded).toBe(false);
      expect(header.clipCount).toBe(2); // Count still present
    });

    it('should render clip count in brackets', () => {
      const html = renderBinHeader('shoot1-20251103', false, 12);
      expect(html).toContain('shoot1-20251103 (12)');
    });
  });

  describe('Bin-level Checkbox', () => {
    beforeEach(() => {
      // Mock selected clips state
      mockPanelState.selectedClips = [];

      // Enhanced groupByBin to include checkbox state
      groupByBin = function(clips, expandedBins, selectedClips) {
        const grouped = {};

        if (!expandedBins) {
          expandedBins = {};
        }

        if (!selectedClips) {
          selectedClips = [];
        }

        clips.forEach(function(clip) {
          let binName = 'Other';

          if (clip.treePath) {
            let parts = clip.treePath.split('\\');
            parts = parts.filter(function(p) { return p.length > 0; });

            if (parts.length >= 3) {
              binName = parts[1];
            }
          }

          if (!grouped[binName]) {
            grouped[binName] = [];
          }
          grouped[binName].push(clip);
        });

        const sortedBinNames = Object.keys(grouped).sort();
        const result = [];

        sortedBinNames.forEach(function(binName) {
          const binClips = grouped[binName];
          const binClipIds = binClips.map(function(clip) { return clip.nodeId; });

          // Calculate checkbox state
          const selectedInBin = binClipIds.filter(function(id) {
            return selectedClips.indexOf(id) !== -1;
          }).length;

          const checkboxState = selectedInBin === 0 ? 'unchecked' :
                               selectedInBin === binClipIds.length ? 'checked' :
                               'indeterminate';

          // Add bin header
          result.push({
            isBinHeader: true,
            binPath: binName,
            isExpanded: expandedBins[binName] === true,
            clipCount: binClips.length,
            checkboxState: checkboxState,
            clipNodeIds: binClipIds
          });

          // Only add clips if bin is expanded
          if (expandedBins[binName] === true) {
            binClips.sort(function(a, b) {
              return a.name.localeCompare(b.name);
            });

            binClips.forEach(function(clip) {
              result.push(clip);
            });
          }
        });

        return result;
      };

      // Enhanced renderBinHeader to support checkbox
      renderBinHeader = function(binPath, isExpanded, clipCount, checkboxState) {
        const arrow = isExpanded ? '▼' : '►';
        const displayName = binPath + (clipCount !== undefined ? ' (' + clipCount + ')' : '');

        let checkboxHtml = '';
        if (checkboxState) {
          const isChecked = checkboxState === 'checked';
          const isIndeterminate = checkboxState === 'indeterminate';
          checkboxHtml = '<input type="checkbox" class="bin-checkbox" ' +
                        (isChecked ? 'checked' : '') +
                        (isIndeterminate ? ' data-indeterminate="true"' : '') +
                        '> ';
        }

        return '<div class="bin-header' + (isExpanded ? '' : ' collapsed') + '" data-bin-path="' + binPath + '">' +
          checkboxHtml + arrow + ' ' + displayName +
          '</div>';
      };
    });

    it('should calculate unchecked state when no clips selected', () => {
      const result = groupByBin(mockClips, {}, []);
      const header = result.find(item => item.isBinHeader && item.binPath === 'shoot1-20251103');

      expect(header.checkboxState).toBe('unchecked');
      expect(header.clipNodeIds).toEqual(['clip-1', 'clip-2']);
    });

    it('should calculate checked state when all clips selected', () => {
      const result = groupByBin(mockClips, {}, ['clip-1', 'clip-2']);
      const header = result.find(item => item.isBinHeader && item.binPath === 'shoot1-20251103');

      expect(header.checkboxState).toBe('checked');
    });

    it('should calculate indeterminate state when some clips selected', () => {
      const result = groupByBin(mockClips, {}, ['clip-1']); // Only first clip
      const header = result.find(item => item.isBinHeader && item.binPath === 'shoot1-20251103');

      expect(header.checkboxState).toBe('indeterminate');
    });

    it('should render checkbox with correct state', () => {
      const uncheckedHtml = renderBinHeader('shoot1-20251103', true, 2, 'unchecked');
      expect(uncheckedHtml).toContain('class="bin-checkbox"');
      expect(uncheckedHtml).not.toContain('checked');

      const checkedHtml = renderBinHeader('shoot1-20251103', true, 2, 'checked');
      expect(checkedHtml).toContain('checked');

      const indeterminateHtml = renderBinHeader('shoot1-20251103', true, 2, 'indeterminate');
      expect(indeterminateHtml).toContain('data-indeterminate="true"');
    });

    it('should include all clip nodeIds for toggle operation', () => {
      const result = groupByBin(mockClips, {}, []);
      const header = result.find(item => item.isBinHeader && item.binPath === 'shoot1-20251103');

      expect(header.clipNodeIds).toHaveLength(2);
      expect(header.clipNodeIds).toContain('clip-1');
      expect(header.clipNodeIds).toContain('clip-2');
    });

    it('should calculate state correctly when bin is collapsed', () => {
      // Bin collapsed, but some clips selected
      const result = groupByBin(mockClips, {}, ['clip-1']);
      const header = result.find(item => item.isBinHeader && item.binPath === 'shoot1-20251103');

      expect(header.isExpanded).toBe(false);
      expect(header.checkboxState).toBe('indeterminate');
    });
  });
});
