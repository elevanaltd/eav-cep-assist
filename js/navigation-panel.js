/**
 * EAV Ingest Assistant - Navigation Panel
 * Component: ClipBrowser with auto-open in Source Monitor + Debug Panel
 */

(function() {
  'use strict';

  // ========================================
  // GLOBAL STATE
  // ========================================

  const PanelState = {
    allClips: [],              // All project clips
    currentClip: null,         // Currently selected clip
    currentClipIndex: -1,      // Index in allClips
    searchFilter: '',          // Search text
    filterVideo: true,         // Show videos
    filterImage: true,         // Show images
    filterTagged: 'all',       // 'all' | 'tagged' | 'untagged'
    sortBy: 'bin',             // Sort order: 'name', 'name-desc', 'bin'
    selectedClips: [],         // Array of nodeIds for batch operations
    expandedBins: {}           // Bin collapse state (undefined/false = collapsed, true = expanded)
  };

  // Initialize CSInterface
  let csInterface;
  try {
    csInterface = new CSInterface();
    addDebug('✓ CSInterface initialized: ' + csInterface.getHostEnvironment().appVersion);
  } catch (e) {
    alert('Error: CSInterface not available. ' + e.message);
    return;
  }

  // ========================================
  // DEBUG PANEL
  // ========================================

  function addDebug(message, isError) {
    const debugContent = document.getElementById('debugContent');
    if (!debugContent) {return;}

    const line = document.createElement('div');
    line.className = 'debug-line' + (isError ? ' error' : '');

    const time = document.createElement('span');
    time.className = 'debug-time';
    time.textContent = new Date().toTimeString().substr(0, 8);

    const msg = document.createElement('span');
    msg.className = 'debug-message';
    msg.textContent = message;

    line.appendChild(time);
    line.appendChild(msg);
    debugContent.appendChild(line);

    // Auto-scroll to bottom
    debugContent.scrollTop = debugContent.scrollHeight;

    // Keep max 200 lines
    while (debugContent.children.length > 200) {
      debugContent.removeChild(debugContent.firstChild);
    }
  }

  function clearDebug() {
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
      debugContent.innerHTML = '';
      addDebug('Debug log cleared');
    }
  }

  // HTML escaping utility (XSS prevention)
  function escapeHTML(str) {
    if (!str) {return '';}
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========================================
  // SECURITY: String escaping for evalScript
  // ========================================

  /**
     * Escape a string for safe use in evalScript string concatenation
     * Prevents code injection by escaping quotes and backslashes
     * @param {string} str - The string to escape
     * @returns {string} - Escaped string safe for evalScript
     */
  function escapeForEvalScript(str) {
    if (!str) {return '';}
    return String(str)
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/'/g, '\\\'')     // Escape single quotes
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r');   // Escape carriage returns
  }

  // ========================================
  // COMPONENT: CLIP BROWSER
  // ========================================

  const ClipBrowser = {
    elements: {
      searchInput: null,
      clearSearchBtn: null,
      filterVideo: null,
      filterImage: null,
      filterTagged: null,
      sortBy: null,
      clipList: null,
      clipCount: null,
      refreshBtn: null
    },

    init: function() {
      const self = this;
      addDebug('[ClipBrowser] Starting init...');

      // Get DOM elements
      this.elements = {
        searchInput: document.getElementById('clipSearch'),
        clearSearchBtn: document.getElementById('clearSearch'),
        filterVideo: document.getElementById('filterVideo'),
        filterImage: document.getElementById('filterImage'),
        filterTagged: document.getElementById('filterTagged'),
        sortBy: document.getElementById('sortBy'),
        clipList: document.getElementById('clipList'),
        clipCount: document.getElementById('clipCount'),
        refreshBtn: document.getElementById('refreshClips'),
        selectAll: document.getElementById('selectAll'),
        selectNone: document.getElementById('selectNone'),
        selectedCount: document.getElementById('selectedCount'),
        batchApply: document.getElementById('batchApply')
      };
      addDebug('[ClipBrowser] ✓ DOM elements retrieved');

      // Set up event listeners
      this.setupEventListeners();
      addDebug('[ClipBrowser] ✓ Event listeners set up');

      // Load all clips from project (with delay on first load to let XMP cache warm up)
      addDebug('[ClipBrowser] Waiting for XMP metadata to load...');
      setTimeout(function() {
        self.loadAllClips();
      }, 1500); // 1.5 second delay for Premiere to fully load XMP
    },

    setupEventListeners: function() {
      const self = this;

      // Search input with debounce (150ms delay to prevent jank during typing)
      let searchTimeout = null;
      this.elements.searchInput.addEventListener('input', function(e) {
        PanelState.searchFilter = e.target.value;
        if (searchTimeout) {clearTimeout(searchTimeout);}
        searchTimeout = setTimeout(function() {
          self.render();
        }, 150);
      });

      // Clear search
      this.elements.clearSearchBtn.addEventListener('click', function() {
        self.elements.searchInput.value = '';
        PanelState.searchFilter = '';
        self.render();
      });

      // Filters
      this.elements.filterVideo.addEventListener('change', function(e) {
        PanelState.filterVideo = e.target.checked;
        self.render();
      });

      this.elements.filterImage.addEventListener('change', function(e) {
        PanelState.filterImage = e.target.checked;
        self.render();
      });

      this.elements.filterTagged.addEventListener('change', function(e) {
        PanelState.filterTagged = e.target.value;
        self.render();
      });

      // Sort dropdown
      this.elements.sortBy.addEventListener('change', function(e) {
        PanelState.sortBy = e.target.value;
        addDebug('[ClipBrowser] Sort changed to: ' + PanelState.sortBy);
        self.render();
      });

      // Refresh button
      this.elements.refreshBtn.addEventListener('click', function() {
        self.loadAllClips();
      });

      // Batch selection controls
      this.elements.selectAll.addEventListener('click', function() {
        self.selectAllClips();
      });

      this.elements.selectNone.addEventListener('click', function() {
        self.clearSelection();
      });

      this.elements.batchApply.addEventListener('click', function() {
        self.batchApplyToPremiere();
      });

      // Keyboard shortcut: Cmd+Shift+A for batch apply
      document.addEventListener('keydown', function(e) {
        if (e.metaKey && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          if (PanelState.selectedClips.length > 0) {
            self.batchApplyToPremiere();
          }
        }
      });

      // Clip list click handling (event delegation)
      this.elements.clipList.addEventListener('click', function(e) {
        // Handle bin checkbox clicks (must come before bin header handling)
        if (e.target.classList.contains('bin-checkbox')) {
          const binHeader = e.target.closest('.bin-header');
          if (binHeader) {
            const binName = binHeader.getAttribute('data-bin-path');
            self.toggleBinSelection(binName);
            e.stopPropagation(); // Don't trigger bin expand/collapse
          }
          return;
        }

        // Handle bin header clicks (expand/collapse)
        const binHeader = e.target.closest('.bin-header');
        if (binHeader) {
          const binName = binHeader.getAttribute('data-bin-path');
          self.toggleBin(binName);
          return;
        }

        // Handle clip checkbox clicks
        if (e.target.classList.contains('clip-checkbox')) {
          const clipItem = e.target.closest('.clip-item');
          if (clipItem) {
            const nodeId = clipItem.getAttribute('data-clip-id');
            self.toggleClipSelection(nodeId);
            e.stopPropagation(); // Don't trigger clip selection
          }
          return;
        }

        // Handle clip selection (clicking anywhere else on the clip item)
        const clipItem = e.target.closest('.clip-item');
        if (clipItem) {
          const nodeId = clipItem.getAttribute('data-clip-id');
          self.selectClip(nodeId);
        }
      });

      // Listen for metadata updates from Metadata Panel (CEP event)
      csInterface.addEventListener('com.elevana.metadata-applied', function(event) {
        addDebug('[ClipBrowser] Received metadata-applied event');
        try {
          // event.data might be string or already parsed object
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          addDebug('[ClipBrowser] Metadata updated for: ' + data.name);

          // Update single clip instead of full reload (performance optimization)
          const clip = PanelState.allClips.find(function(c) { return c.nodeId === data.nodeId; });
          if (clip) {
            clip.name = data.name;
            addDebug('[ClipBrowser] ✓ Updated clip name in state');
            self.render();
          } else {
            addDebug('[ClipBrowser] ⚠ Clip not found in state, falling back to full reload');
            self.loadAllClips();
          }
        } catch (e) {
          addDebug('[ClipBrowser] ✗ Failed to parse metadata event: ' + e.message, true);
        }
      });

      // Listen for clip selection from Metadata Panel navigation (CEP event)
      csInterface.addEventListener('com.elevana.clip-selected', function(event) {
        addDebug('[ClipBrowser] Received clip-selected event (external navigation)');
        try {
          // Parse event data
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          // Handle both old format (just clip) and new format (clip + navigation context)
          const clip = data.clip || data;

          if (clip && clip.nodeId) {
            addDebug('[ClipBrowser] Syncing to: ' + clip.name);
            // Use syncSelection() to update UI without triggering Source Monitor or new event
            self.syncSelection(clip.nodeId);
          } else {
            addDebug('[ClipBrowser] ✗ Invalid clip data in event', true);
          }
        } catch (e) {
          addDebug('[ClipBrowser] ✗ Failed to parse clip-selected event: ' + e.message, true);
        }
      });
    },

    loadAllClips: function() {
      const self = this;
      addDebug('[ClipBrowser] Loading clips from project...');

      if (!csInterface) {
        addDebug('[ClipBrowser] ✗ csInterface not available!', true);
        self.showEmptyState('CSInterface not initialized');
        return;
      }

      // Test if ExtendScript is available
      csInterface.evalScript('typeof EAVIngest', function(testResult) {
        addDebug('[ClipBrowser] typeof EAVIngest: ' + testResult);

        if (testResult === 'undefined') {
          addDebug('[ClipBrowser] ✗ EAVIngest undefined!', true);
          self.showEmptyState('ExtendScript not loaded');
          return;
        }

        addDebug('[ClipBrowser] ✓ EAVIngest available');
        addDebug('[ClipBrowser] Calling getAllProjectClips...');

        csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
          try {
            const data = JSON.parse(result);

            if (data.error) {
              addDebug('[ClipBrowser] ✗ Error: ' + data.error, true);
              self.showEmptyState(data.error);
              return;
            }

            if (data.clips && data.clips.length > 0) {
              // Filter out any clips without nodeId
              const validClips = data.clips.filter(function(clip) {
                return clip.nodeId ? true : false;
              });

              if (validClips.length === 0) {
                addDebug('[ClipBrowser] ✗ No valid clips found', true);
                self.showEmptyState('No valid clips in project');
                return;
              }

              PanelState.allClips = validClips;
              addDebug('[ClipBrowser] ✓ Loaded ' + validClips.length + ' clips');

              // DEBUG: Show first clip structure
              if (validClips.length > 0) {
                addDebug('[ClipBrowser] === FIRST CLIP DEBUG ===');
                const firstClip = validClips[0];
                addDebug('[ClipBrowser] name: "' + (firstClip.name || 'EMPTY') + '"');
                addDebug('[ClipBrowser] treePath: "' + (firstClip.treePath || 'EMPTY') + '"');
                addDebug('[ClipBrowser] identifier: "' + (firstClip.identifier || 'EMPTY') + '"');
                addDebug('[ClipBrowser] description: "' + (firstClip.description || 'EMPTY') + '"');
                addDebug('[ClipBrowser] rawLogComment: "' + (firstClip.rawLogComment || 'EMPTY') + '"');
                addDebug('[ClipBrowser] regexAttempt: "' + (firstClip.regexAttempt || 'EMPTY') + '"');
                addDebug('[ClipBrowser] logCommentContext: "' + (firstClip.logCommentContext || 'EMPTY') + '"');
                addDebug('[ClipBrowser] availableColumns: "' + (firstClip.availableColumns || 'EMPTY') + '"');
                addDebug('[ClipBrowser] xmpSnippet: "' + (firstClip.xmpSnippet || 'EMPTY').substring(0, 200) + '..."');
                addDebug('[ClipBrowser] good: "' + (firstClip.good || 'EMPTY') + '"');
                addDebug('[ClipBrowser] shot: "' + (firstClip.shot || 'EMPTY') + '"');
                addDebug('[ClipBrowser] === END DEBUG ===');
              }

              self.render();

              // Auto-select first clip if none selected
              if (!PanelState.currentClip && validClips.length > 0) {
                addDebug('[ClipBrowser] Auto-selecting first clip');
                self.selectClip(validClips[0].nodeId);
              }
            } else {
              addDebug('[ClipBrowser] No clips found in project');
              self.showEmptyState('No clips in project');
            }
          } catch (e) {
            addDebug('[ClipBrowser] ✗ JSON Parse error: ' + e.message, true);
            self.showEmptyState('Failed to load clips');
          }
        });
      });
    },

    render: function() {
      const filteredClips = this.getFilteredClips();

      if (filteredClips.length === 0) {
        this.showEmptyState('No clips match filters');
        return;
      }

      // Apply sorting
      const sortedClips = this.sortClips(filteredClips);

      const html = sortedClips.map(function(item) {
        // Check if this is a bin header
        if (item.isBinHeader) {
          // binPath is now just the bin name (e.g., "shoot1-20251024" or "Other")
          const binName = escapeHTML(item.binPath);
          const arrow = item.isExpanded ? '▼' : '►';
          const collapsedClass = item.isExpanded ? '' : ' collapsed';
          const displayName = binName + ' (' + item.clipCount + ')';

          // Checkbox state
          const isChecked = item.checkboxState === 'checked';
          const isIndeterminate = item.checkboxState === 'indeterminate';
          const checkboxHtml = '<input type="checkbox" class="bin-checkbox" ' +
                              (isChecked ? 'checked' : '') +
                              (isIndeterminate ? ' data-indeterminate="true"' : '') + '> ';

          return '<div class="bin-header' + collapsedClass + '" data-bin-path="' + binName + '">' +
                           checkboxHtml + arrow + ' ' + displayName +
                           '</div>';
        }

        // Regular clip item
        const clip = item;

        // Skip clips without nodeId (safety check)
        if (!clip.nodeId) {return '';}

        const isSelected = PanelState.currentClip && clip.nodeId === PanelState.currentClip.nodeId;
        const isChecked = PanelState.selectedClips.indexOf(clip.nodeId) !== -1;

        // Check for structured naming pattern (XMP metadata removed - now using JSON sidecars)
        // Naming pattern: {location}-{subject}-{action}-{shotType} (e.g., "kitchen-wine-cooler-opening-CU")
        // At minimum: 2+ hyphen-separated parts indicates clip has been processed
        const hasStructuredName = clip.name && clip.name.indexOf('-') !== -1 &&
                                  clip.name.split('-').length >= 2 &&
                                  !clip.name.match(/^EA\d{6}/i); // Exclude original camera names like EA001234
        const hasMetadata = hasStructuredName;

        const statusIcon = hasMetadata ? '✓' : '•';
        const statusClass = hasMetadata ? 'tagged' : 'untagged';

        // Add 'in-bin' class if we're in bin grouping mode
        const inBinClass = (PanelState.sortBy === 'bin') ? ' in-bin' : '';

        // Escape clip name for XSS prevention
        const safeName = escapeHTML(clip.name || 'Unknown');

        return '<div class="clip-item' + inBinClass +
                       (isSelected ? ' selected' : '') +
                       (isChecked ? ' checked' : '') + '" ' +
                       'data-clip-id="' + clip.nodeId + '" ' +
                       'role="listitem" tabindex="0">' +
                       '<input type="checkbox" class="clip-checkbox" ' + (isChecked ? 'checked' : '') + '>' +
                       '<span class="status-icon ' + statusClass + '">' + statusIcon + '</span>' +
                       '<span class="clip-name" title="' + safeName + '">' + safeName + '</span>' +
                       '</div>';
      }).join('');

      this.elements.clipList.innerHTML = html;

      // Set indeterminate state on bin checkboxes (must be done via JavaScript, not HTML)
      const indeterminateCheckboxes = this.elements.clipList.querySelectorAll('.bin-checkbox[data-indeterminate="true"]');
      indeterminateCheckboxes.forEach(function(checkbox) {
        checkbox.indeterminate = true;
      });

      // Count actual clips (exclude bin headers)
      const clipCount = sortedClips.filter(function(item) {
        return !item.isBinHeader;
      }).length;
      this.elements.clipCount.textContent = clipCount + ' clip' + (clipCount === 1 ? '' : 's');

      // Update selection UI
      this.updateSelectionUI();
    },

    getFilteredClips: function() {
      const search = PanelState.searchFilter.toLowerCase();

      return PanelState.allClips.filter(function(clip) {
        // Search filter
        if (search && clip.name.toLowerCase().indexOf(search) === -1) {
          return false;
        }

        // Type filters (basic heuristic: check file extension)
        const isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
        const isImage = /\.(jpg|jpeg|png|tif|tiff)$/i.test(clip.mediaPath);

        if (isVideo && !PanelState.filterVideo) {return false;}
        if (isImage && !PanelState.filterImage) {return false;}

        // Tagged filter - uses structured naming pattern (XMP fields removed)
        const hasStructuredName = clip.name && clip.name.indexOf('-') !== -1 &&
                                  clip.name.split('-').length >= 2 &&
                                  !clip.name.match(/^EA\d{6}/i);
        if (PanelState.filterTagged === 'tagged' && !hasStructuredName) {return false;}
        if (PanelState.filterTagged === 'untagged' && hasStructuredName) {return false;}

        return true;
      });
    },

    sortClips: function(clips) {
      // Apply sort based on PanelState.sortBy
      let sorted = clips.slice(); // Copy array to avoid mutation

      switch (PanelState.sortBy) {
      case 'name':
        // Alphabetical A-Z
        sorted.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        });
        break;

      case 'name-desc':
        // Reverse alphabetical Z-A
        sorted.sort(function(a, b) {
          return b.name.localeCompare(a.name);
        });
        break;

      case 'bin':
        // Group by bin with headers
        sorted = this.groupByBin(sorted);
        break;

      default:
        // No sorting, return as-is
        break;
      }

      return sorted;
    },

    groupByBin: function(clips) {
      // Group clips by bin name extracted from treePath
      const grouped = {};

      clips.forEach(function(clip) {
        let binName = 'Other'; // Default for clips without bin

        if (clip.treePath) {
          // treePath format: \ProjectName\BinName\FileName
          // Example: \EAV014 - PH Video.prproj\shoot1-20251024\EA001676.MOV
          let parts = clip.treePath.split('\\'); // Split by backslash

          // Remove empty strings from leading backslash
          parts = parts.filter(function(p) { return p.length > 0; });

          // parts[0] = ProjectName (e.g., "EAV014 - PH Video.prproj")
          // parts[1] = BinName (e.g., "shoot1-20251024" or "Stock")
          // parts[2] = FileName (e.g., "EA001676.MOV")

          if (parts.length >= 3) {
            // Has bin: use second segment (index 1)
            binName = parts[1];
          } else if (parts.length === 2) {
            // No bin: clip at project root
            binName = 'Other';
          }
        }

        if (!grouped[binName]) {
          grouped[binName] = [];
        }
        grouped[binName].push(clip);
      });

      // Sort bin names alphabetically
      const sortedBinNames = Object.keys(grouped).sort(function(a, b) {
        return a.localeCompare(b);
      });

      // Flatten to array with bin headers
      const result = [];
      sortedBinNames.forEach(function(binName) {
        const binClips = grouped[binName];
        const binClipIds = binClips.map(function(clip) { return clip.nodeId; });

        // Check if bin is expanded
        const isExpanded = PanelState.expandedBins[binName] === true;

        // Calculate checkbox state
        const selectedInBin = binClipIds.filter(function(id) {
          return PanelState.selectedClips.indexOf(id) !== -1;
        }).length;

        const checkboxState = selectedInBin === 0 ? 'unchecked' :
          selectedInBin === binClipIds.length ? 'checked' :
            'indeterminate';

        // Add bin header
        result.push({
          isBinHeader: true,
          binPath: binName, // Just the bin name, not full path
          isExpanded: isExpanded,
          clipCount: binClips.length,
          checkboxState: checkboxState,
          clipNodeIds: binClipIds
        });

        // Only add clips if bin is expanded
        if (isExpanded) {
          // Sort clips within bin alphabetically
          binClips.sort(function(a, b) {
            return a.name.localeCompare(b.name);
          });

          // Add clips
          binClips.forEach(function(clip) {
            result.push(clip);
          });
        }
      });

      return result;
    },

    syncSelection: function(nodeId) {
      // Selection update for external navigation (updates UI + Source Monitor, no event dispatch)
      addDebug('[ClipBrowser] Syncing selection: ' + nodeId);

      // Validate nodeId
      if (!nodeId || nodeId === 'undefined' || nodeId === 'null') {
        addDebug('[ClipBrowser] ✗ Invalid nodeId for sync', true);
        return;
      }

      const clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
      if (!clip) {
        addDebug('[ClipBrowser] ✗ Clip not found for sync', true);
        return;
      }

      // Check if already selected (avoid redundant work)
      if (PanelState.currentClip && PanelState.currentClip.nodeId === nodeId) {
        addDebug('[ClipBrowser] ℹ Already selected, skipping sync');
        return;
      }

      const index = PanelState.allClips.indexOf(clip);
      PanelState.currentClip = clip;
      PanelState.currentClipIndex = index;

      addDebug('[ClipBrowser] ✓ Synced selection: ' + clip.name);

      // Re-render to update selection UI (highlights clip)
      this.render();

      // Open in Source Monitor (user expects to see the clip)
      this.openInSourceMonitor(clip.nodeId);

      // Do NOT dispatch event (prevents infinite loops)
    },

    selectClip: function(nodeId) {
      addDebug('[ClipBrowser] Selecting clip: ' + nodeId);

      // Validate nodeId
      if (!nodeId || nodeId === 'undefined' || nodeId === 'null') {
        addDebug('[ClipBrowser] ✗ Invalid nodeId', true);
        return;
      }

      const clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
      if (!clip) {
        addDebug('[ClipBrowser] ✗ Clip not found', true);
        return;
      }

      // Double-check clip has valid nodeId
      if (!clip.nodeId) {
        addDebug('[ClipBrowser] ✗ Clip has no nodeId', true);
        return;
      }

      const index = PanelState.allClips.indexOf(clip);
      PanelState.currentClip = clip;
      PanelState.currentClipIndex = index;

      // Calculate position in FILTERED AND SORTED list (what user actually sees)
      const filteredClips = this.getFilteredClips();
      const sortedClips = this.sortClips(filteredClips);

      // Remove bin headers from sorted list (only actual clips for navigation)
      const sortedClipsOnly = sortedClips.filter(function(item) {
        return !item.isBinHeader;
      });

      const sortedIndex = sortedClipsOnly.indexOf(clip);
      const totalSorted = sortedClipsOnly.length;

      addDebug('[ClipBrowser] ✓ Selected: ' + clip.name + ' (index: ' + sortedIndex + '/' + totalSorted + ')');

      // Emit CEP event for other extensions (e.g., Metadata Panel)
      try {
        const event = new CSEvent('com.elevana.clip-selected', 'APPLICATION');
        // Send clip data + navigation context with SORTED clips
        event.data = JSON.stringify({
          clip: clip,
          clipIndex: sortedIndex,
          totalClips: totalSorted,
          filteredClips: sortedClipsOnly // Send SORTED clips (matching visual order)
        });
        csInterface.dispatchEvent(event);
        addDebug('[ClipBrowser] ✓ CEP event dispatched (index: ' + sortedIndex + '/' + totalSorted + ')');
      } catch (e) {
        addDebug('[ClipBrowser] ✗ Failed to dispatch CEP event: ' + e.message, true);
      }

      // Re-render to update selection UI
      this.render();

      // AUTO-OPEN IN SOURCE MONITOR
      this.openInSourceMonitor(clip.nodeId);
    },

    openInSourceMonitor: function(nodeId) {
      addDebug('[ClipBrowser] Opening in Source Monitor: ' + nodeId);

      // SECURITY: Escape nodeId to prevent code injection
      const escapedNodeId = escapeForEvalScript(nodeId);
      csInterface.evalScript('EAVIngest.openInSourceMonitor("' + escapedNodeId + '")', function(result) {
        try {
          const data = JSON.parse(result);

          if (data.success) {
            addDebug('[ClipBrowser] ✓ Opened in Source Monitor');
          } else {
            addDebug('[ClipBrowser] ✗ Failed to open: ' + (data.error || 'Unknown error'), true);
          }
        } catch (e) {
          addDebug('[ClipBrowser] ✗ Error opening: ' + e.message, true);
        }
      });
    },

    toggleClipSelection: function(nodeId) {
      const index = PanelState.selectedClips.indexOf(nodeId);
      if (index === -1) {
        // Add to selection
        PanelState.selectedClips.push(nodeId);
        addDebug('[ClipBrowser] ✓ Clip selected for batch: ' + nodeId);
      } else {
        // Remove from selection
        PanelState.selectedClips.splice(index, 1);
        addDebug('[ClipBrowser] Clip deselected: ' + nodeId);
      }
      this.render(); // Re-render to update checkboxes and UI
    },

    toggleBin: function(binName) {
      // Toggle bin expanded state (undefined or false → true, true → false)
      const currentState = PanelState.expandedBins[binName] || false;
      PanelState.expandedBins[binName] = !currentState;

      const newState = PanelState.expandedBins[binName] ? 'expanded' : 'collapsed';
      addDebug('[ClipBrowser] Bin "' + binName + '" ' + newState);

      this.render(); // Re-render to show/hide clips
    },

    toggleBinSelection: function(binName) {
      // Find all clips in this bin
      const binClips = PanelState.allClips.filter(function(clip) {
        if (!clip.treePath) {
          return binName === 'Other';
        }

        const parts = clip.treePath.split('\\').filter(function(p) { return p.length > 0; });
        const clipBinName = parts.length >= 3 ? parts[1] : 'Other';
        return clipBinName === binName;
      });

      const binClipIds = binClips.map(function(clip) { return clip.nodeId; });

      // Check current selection state
      const selectedInBin = binClipIds.filter(function(id) {
        return PanelState.selectedClips.indexOf(id) !== -1;
      }).length;

      if (selectedInBin === binClipIds.length) {
        // All selected → deselect all
        binClipIds.forEach(function(id) {
          const index = PanelState.selectedClips.indexOf(id);
          if (index !== -1) {
            PanelState.selectedClips.splice(index, 1);
          }
        });
        addDebug('[ClipBrowser] Bin "' + binName + '" deselected (' + binClipIds.length + ' clips)');
      } else {
        // Some or none selected → select all
        binClipIds.forEach(function(id) {
          if (PanelState.selectedClips.indexOf(id) === -1) {
            PanelState.selectedClips.push(id);
          }
        });
        addDebug('[ClipBrowser] Bin "' + binName + '" selected (' + binClipIds.length + ' clips)');
      }

      this.render(); // Re-render to update checkboxes
    },

    selectAllClips: function() {
      const filteredClips = this.getFilteredClips();
      PanelState.selectedClips = filteredClips.map(function(clip) {
        return clip.nodeId;
      });
      addDebug('[ClipBrowser] ✓ Selected all clips: ' + PanelState.selectedClips.length);
      this.render();
    },

    clearSelection: function() {
      const count = PanelState.selectedClips.length;
      PanelState.selectedClips = [];
      addDebug('[ClipBrowser] Selection cleared: ' + count + ' clips');
      this.render();
    },

    updateSelectionUI: function() {
      const count = PanelState.selectedClips.length;
      this.elements.selectedCount.textContent = count + ' selected';
      this.elements.batchApply.disabled = (count === 0);
    },

    batchApplyToPremiere: function() {
      const self = this;
      const selectedCount = PanelState.selectedClips.length;

      if (selectedCount === 0) {
        addDebug('[ClipBrowser] ✗ No clips selected for batch apply', true);
        return;
      }

      addDebug('[ClipBrowser] ⚡ Starting batch apply: ' + selectedCount + ' clips');

      // Disable batch apply button and show processing state
      this.elements.batchApply.disabled = true;
      this.elements.batchApply.classList.add('processing');
      this.elements.batchApply.innerHTML = '<span class="batch-icon">⏳</span> Processing...';

      // Get clip data for all selected clips
      const selectedClipData = PanelState.selectedClips.map(function(nodeId) {
        return PanelState.allClips.find(function(clip) {
          return clip.nodeId === nodeId;
        });
      }).filter(function(clip) {
        return clip !== null; // Remove any nulls
      });

      let processedCount = 0;
      let errorCount = 0;

      // Process each clip sequentially
      function processNextClip(index) {
        if (index >= selectedClipData.length) {
          // All done!
          addDebug('[ClipBrowser] ✓ Batch apply complete: ' +
                             processedCount + ' succeeded, ' + errorCount + ' failed');

          // Reset button state
          self.elements.batchApply.classList.remove('processing');
          self.elements.batchApply.innerHTML = '<span class="batch-icon">⚡</span> Batch Apply to Premiere';
          self.elements.batchApply.disabled = false;

          // Clear selection
          self.clearSelection();

          // Refresh clip list to show updated names
          self.loadAllClips();
          return;
        }

        const clip = selectedClipData[index];
        addDebug('[ClipBrowser] Processing (' + (index + 1) + '/' + selectedClipData.length + '): ' + clip.name);

        // Update progress in button
        self.elements.batchApply.innerHTML =
                    '<span class="batch-icon">⏳</span> Processing ' + (index + 1) + '/' + selectedClipData.length;

        // NEW: JSON-based approach (Track A/B integration)
        // Step 1: Read JSON metadata from .ingest-metadata.json sidecar
        const escapedNodeId = escapeForEvalScript(clip.nodeId);
        const readScript = 'EAVIngest.readJSONMetadataByNodeId("' + escapedNodeId + '")';

        csInterface.evalScript(readScript, function(jsonResult) {
          let jsonMetadata;
          try {
            jsonMetadata = JSON.parse(jsonResult);
          } catch (e) {
            addDebug('[ClipBrowser] ✗ JSON parse error for ' + clip.name + ': ' + e.message, true);
            errorCount++;
            setTimeout(function() { processNextClip(index + 1); }, 100);
            return;
          }

          // Check if JSON metadata exists and is valid
          if (!jsonMetadata || jsonMetadata === 'null' || typeof jsonMetadata !== 'object') {
            addDebug('[ClipBrowser] ✗ No JSON metadata for ' + clip.name, true);
            errorCount++;
            setTimeout(function() { processNextClip(index + 1); }, 100);
            return;
          }

          addDebug('[ClipBrowser] ✓ JSON loaded: ' + (jsonMetadata.location || '-') + '-' + (jsonMetadata.subject || '-'));

          // Step 2: Write JSON metadata (triggers JSON update + PP Clip Name update)
          // Pass through existing metadata fields - writeJSONMetadataByNodeId computes shotName
          const updates = {
            location: jsonMetadata.location || '',
            subject: jsonMetadata.subject || '',
            action: jsonMetadata.action || '',
            shotType: jsonMetadata.shotType || '',
            shotNumber: jsonMetadata.shotNumber || 0,
            keywords: jsonMetadata.keywords || []
          };

          const updatesJson = JSON.stringify(updates).replace(/'/g, '\\\'');
          const writeScript = 'EAVIngest.writeJSONMetadataByNodeId("' + escapedNodeId + '", JSON.parse(\'' + updatesJson + '\'))';

          csInterface.evalScript(writeScript, function(writeResult) {
            if (writeResult === 'true') {
              processedCount++;
              addDebug('[ClipBrowser] ✓ Applied to ' + clip.name);
            } else {
              errorCount++;
              addDebug('[ClipBrowser] ✗ Write failed for ' + clip.name + ': ' + writeResult, true);
            }

            // Process next clip after a small delay to avoid overwhelming Premiere
            setTimeout(function() {
              processNextClip(index + 1);
            }, 100);
          });
        });
      }

      // Start processing
      processNextClip(0);
    },

    showEmptyState: function(message) {
      this.elements.clipList.innerHTML =
                '<div class="clip-list-empty">' +
                '<p>' + message + '</p>' +
                '</div>';
      this.elements.clipCount.textContent = '0 clips';
      this.updateSelectionUI(); // Update selection UI even when empty
    }
  };

  // ========================================
  // INITIALIZATION
  // ========================================

  function init() {
    addDebug('=== Navigation Panel Initializing ===');

    // Initialize Debug Panel clear button
    const clearDebugBtn = document.getElementById('clearDebug');
    if (clearDebugBtn) {
      clearDebugBtn.addEventListener('click', clearDebug);
      addDebug('✓ Debug panel ready');
    }

    // Load ExtendScript manually (CSInterface.evalFile doesn't work reliably)
    const extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
    const jsxPath = extensionRoot + '/jsx/host.jsx';
    addDebug('[Init] Loading ExtendScript: ' + jsxPath);

    // Set extension root global BEFORE loading host.jsx (fixes $.fileName issue in CEP context)
    // Use double quotes for outer string, single quotes for ExtendScript string value
    csInterface.evalScript('var CEP_EXTENSION_ROOT = \'' + extensionRoot + '\'', function(rootResult) {
      addDebug('[Init] CEP_EXTENSION_ROOT set to: ' + extensionRoot);
      addDebug('[Init] CEP_EXTENSION_ROOT result: ' + rootResult);

      // Now load host.jsx - it will use CEP_EXTENSION_ROOT instead of $.fileName
      // Wrap in try/catch to capture actual error
      const loadScript = 'try { $.evalFile(\'' + jsxPath + '\'); \'SUCCESS\'; } catch(e) { \'ERROR: \' + e.toString() + \' at line \' + e.line; }';
      addDebug('[Init] Loading with: ' + loadScript.substring(0, 100) + '...');

      csInterface.evalScript(loadScript, function(result) {
        addDebug('[Init] Load result: ' + result);

        if (result && result.indexOf('ERROR:') === 0) {
          addDebug('[Init] ✗ ExtendScript threw error: ' + result, true);
          return;
        }

        // Check if EAVIngest is now available
        csInterface.evalScript('typeof EAVIngest', function(typeResult) {
          addDebug('[Init] typeof EAVIngest: ' + typeResult);

          if (typeResult === 'object') {
            addDebug('[Init] ✓ ExtendScript loaded successfully');
            ClipBrowser.init();
            addDebug('✓ ClipBrowser initialized');
            addDebug('=== Navigation Panel Ready ===');
          } else {
            addDebug('[Init] ✗ ExtendScript load failed - EAVIngest not available', true);

            // Additional diagnostics
            csInterface.evalScript('typeof readJSONMetadataByNodeIdWrapper', function(wrapperType) {
              addDebug('[Init] typeof readJSONMetadataByNodeIdWrapper: ' + wrapperType);
            });
          }
        });
      });
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
