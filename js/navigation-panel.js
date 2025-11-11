/**
 * EAV Ingest Assistant - Navigation Panel
 * Component: ClipBrowser with auto-open in Source Monitor + Debug Panel
 */

(function() {
    'use strict';

    // ========================================
    // GLOBAL STATE
    // ========================================

    var PanelState = {
        allClips: [],              // All project clips
        currentClip: null,         // Currently selected clip
        currentClipIndex: -1,      // Index in allClips
        searchFilter: '',          // Search text
        filterVideo: true,         // Show videos
        filterImage: true,         // Show images
        filterHasMeta: false,      // Show only tagged clips
        sortBy: 'bin'              // Sort order: 'name', 'name-desc', 'bin'
    };

    // Initialize CSInterface
    var csInterface;
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
        var debugContent = document.getElementById('debugContent');
        if (!debugContent) return;

        var line = document.createElement('div');
        line.className = 'debug-line' + (isError ? ' error' : '');

        var time = document.createElement('span');
        time.className = 'debug-time';
        time.textContent = new Date().toTimeString().substr(0, 8);

        var msg = document.createElement('span');
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
        var debugContent = document.getElementById('debugContent');
        if (debugContent) {
            debugContent.innerHTML = '';
            addDebug('Debug log cleared');
        }
    }

    // HTML escaping utility (XSS prevention)
    function escapeHTML(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ========================================
    // COMPONENT: CLIP BROWSER
    // ========================================

    var ClipBrowser = {
        elements: {
            searchInput: null,
            clearSearchBtn: null,
            filterVideo: null,
            filterImage: null,
            filterHasMeta: null,
            sortBy: null,
            clipList: null,
            clipCount: null,
            refreshBtn: null
        },

        init: function() {
            var self = this;
            addDebug('[ClipBrowser] Starting init...');

            // Get DOM elements
            this.elements = {
                searchInput: document.getElementById('clipSearch'),
                clearSearchBtn: document.getElementById('clearSearch'),
                filterVideo: document.getElementById('filterVideo'),
                filterImage: document.getElementById('filterImage'),
                filterHasMeta: document.getElementById('filterHasMeta'),
                sortBy: document.getElementById('sortBy'),
                clipList: document.getElementById('clipList'),
                clipCount: document.getElementById('clipCount'),
                refreshBtn: document.getElementById('refreshClips')
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
            var self = this;

            // Search input
            this.elements.searchInput.addEventListener('input', function(e) {
                PanelState.searchFilter = e.target.value;
                self.render();
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

            this.elements.filterHasMeta.addEventListener('change', function(e) {
                PanelState.filterHasMeta = e.target.checked;
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

            // Clip list click handling (event delegation)
            this.elements.clipList.addEventListener('click', function(e) {
                // Ignore clicks on bin headers
                if (e.target.closest('.bin-header')) {
                    return;
                }

                var clipItem = e.target.closest('.clip-item');
                if (clipItem) {
                    var nodeId = clipItem.getAttribute('data-clip-id');
                    self.selectClip(nodeId);
                }
            });

            // Listen for metadata updates from Metadata Panel (CEP event)
            csInterface.addEventListener("com.elevana.metadata-applied", function(event) {
                addDebug('[ClipBrowser] Received metadata-applied event');
                try {
                    // event.data might be string or already parsed object
                    var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    addDebug('[ClipBrowser] Metadata updated for: ' + data.name);
                    // Refresh clip list to show updated name
                    self.loadAllClips();
                } catch (e) {
                    addDebug('[ClipBrowser] ✗ Failed to parse metadata event: ' + e.message, true);
                }
            });

            // Listen for clip selection from Metadata Panel navigation (CEP event)
            csInterface.addEventListener("com.elevana.clip-selected", function(event) {
                addDebug('[ClipBrowser] Received clip-selected event (external navigation)');
                try {
                    // Parse event data
                    var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    // Handle both old format (just clip) and new format (clip + navigation context)
                    var clip = data.clip || data;

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
            var self = this;
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
                        var data = JSON.parse(result);

                        if (data.error) {
                            addDebug('[ClipBrowser] ✗ Error: ' + data.error, true);
                            self.showEmptyState(data.error);
                            return;
                        }

                        if (data.clips && data.clips.length > 0) {
                            // Filter out any clips without nodeId
                            var validClips = data.clips.filter(function(clip) {
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
                                var firstClip = validClips[0];
                                addDebug('[ClipBrowser] name: "' + (firstClip.name || 'EMPTY') + '"');
                                addDebug('[ClipBrowser] treePath: "' + (firstClip.treePath || 'EMPTY') + '"');
                                addDebug('[ClipBrowser] identifier: "' + (firstClip.identifier || 'EMPTY') + '"');
                                addDebug('[ClipBrowser] description: "' + (firstClip.description || 'EMPTY') + '"');
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
            var filteredClips = this.getFilteredClips();

            if (filteredClips.length === 0) {
                this.showEmptyState('No clips match filters');
                return;
            }

            // Apply sorting
            var sortedClips = this.sortClips(filteredClips);

            var html = sortedClips.map(function(item) {
                // Check if this is a bin header
                if (item.isBinHeader) {
                    // binPath is now just the bin name (e.g., "shoot1-20251024" or "Other")
                    var binName = escapeHTML(item.binPath);
                    return '<div class="bin-header" data-bin-path="' + binName + '">' +
                           binName +
                           '</div>';
                }

                // Regular clip item
                var clip = item;

                // Skip clips without nodeId (safety check)
                if (!clip.nodeId) return '';

                var isSelected = PanelState.currentClip && clip.nodeId === PanelState.currentClip.nodeId;
                var hasMetadata = clip.shot || clip.description || clip.identifier;
                var statusIcon = hasMetadata ? '✓' : '•';
                var statusClass = hasMetadata ? 'tagged' : 'untagged';

                // Add 'in-bin' class if we're in bin grouping mode
                var inBinClass = (PanelState.sortBy === 'bin') ? ' in-bin' : '';

                // Escape clip name for XSS prevention
                var safeName = escapeHTML(clip.name || 'Unknown');

                return '<div class="clip-item' + inBinClass + (isSelected ? ' selected' : '') + '" ' +
                       'data-clip-id="' + clip.nodeId + '" ' +
                       'role="listitem" tabindex="0">' +
                       '<span class="status-icon ' + statusClass + '">' + statusIcon + '</span>' +
                       '<span class="clip-name" title="' + safeName + '">' + safeName + '</span>' +
                       '</div>';
            }).join('');

            this.elements.clipList.innerHTML = html;

            // Count actual clips (exclude bin headers)
            var clipCount = sortedClips.filter(function(item) {
                return !item.isBinHeader;
            }).length;
            this.elements.clipCount.textContent = clipCount + ' clip' + (clipCount === 1 ? '' : 's');
        },

        getFilteredClips: function() {
            var search = PanelState.searchFilter.toLowerCase();

            return PanelState.allClips.filter(function(clip) {
                // Search filter
                if (search && clip.name.toLowerCase().indexOf(search) === -1) {
                    return false;
                }

                // Type filters (basic heuristic: check file extension)
                var isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
                var isImage = /\.(jpg|jpeg|png|tif|tiff)$/i.test(clip.mediaPath);

                if (isVideo && !PanelState.filterVideo) return false;
                if (isImage && !PanelState.filterImage) return false;

                // Metadata filter
                var hasMetadata = clip.shot || clip.description || clip.identifier;
                if (PanelState.filterHasMeta && !hasMetadata) return false;

                return true;
            });
        },

        sortClips: function(clips) {
            // Apply sort based on PanelState.sortBy
            var sorted = clips.slice(); // Copy array to avoid mutation

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
            var grouped = {};
            var self = this;

            clips.forEach(function(clip) {
                var binName = 'Other'; // Default for clips without bin

                if (clip.treePath) {
                    // treePath format: \ProjectName\BinName\FileName
                    // Example: \EAV014 - PH Video.prproj\shoot1-20251024\EA001676.MOV
                    var parts = clip.treePath.split('\\'); // Split by backslash

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
            var sortedBinNames = Object.keys(grouped).sort(function(a, b) {
                return a.localeCompare(b);
            });

            // Flatten to array with bin headers
            var result = [];
            sortedBinNames.forEach(function(binName) {
                // Add bin header
                result.push({
                    isBinHeader: true,
                    binPath: binName // Just the bin name, not full path
                });

                // Sort clips within bin alphabetically
                var binClips = grouped[binName];
                binClips.sort(function(a, b) {
                    return a.name.localeCompare(b.name);
                });

                // Add clips
                binClips.forEach(function(clip) {
                    result.push(clip);
                });
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

            var clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
            if (!clip) {
                addDebug('[ClipBrowser] ✗ Clip not found for sync', true);
                return;
            }

            // Check if already selected (avoid redundant work)
            if (PanelState.currentClip && PanelState.currentClip.nodeId === nodeId) {
                addDebug('[ClipBrowser] ℹ Already selected, skipping sync');
                return;
            }

            var index = PanelState.allClips.indexOf(clip);
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

            var clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
            if (!clip) {
                addDebug('[ClipBrowser] ✗ Clip not found', true);
                return;
            }

            // Double-check clip has valid nodeId
            if (!clip.nodeId) {
                addDebug('[ClipBrowser] ✗ Clip has no nodeId', true);
                return;
            }

            var index = PanelState.allClips.indexOf(clip);
            PanelState.currentClip = clip;
            PanelState.currentClipIndex = index;

            // Calculate position in FILTERED AND SORTED list (what user actually sees)
            var filteredClips = this.getFilteredClips();
            var sortedClips = this.sortClips(filteredClips);

            // Remove bin headers from sorted list (only actual clips for navigation)
            var sortedClipsOnly = sortedClips.filter(function(item) {
                return !item.isBinHeader;
            });

            var sortedIndex = sortedClipsOnly.indexOf(clip);
            var totalSorted = sortedClipsOnly.length;

            addDebug('[ClipBrowser] ✓ Selected: ' + clip.name + ' (index: ' + sortedIndex + '/' + totalSorted + ')');

            // Emit CEP event for other extensions (e.g., Metadata Panel)
            try {
                var event = new CSEvent("com.elevana.clip-selected", "APPLICATION");
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

            csInterface.evalScript('EAVIngest.openInSourceMonitor("' + nodeId + '")', function(result) {
                try {
                    var data = JSON.parse(result);

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

        showEmptyState: function(message) {
            this.elements.clipList.innerHTML =
                '<div class="clip-list-empty">' +
                '<p>' + message + '</p>' +
                '</div>';
            this.elements.clipCount.textContent = '0 clips';
        }
    };

    // ========================================
    // INITIALIZATION
    // ========================================

    function init() {
        addDebug('=== Navigation Panel Initializing ===');

        // Initialize Debug Panel clear button
        var clearDebugBtn = document.getElementById('clearDebug');
        if (clearDebugBtn) {
            clearDebugBtn.addEventListener('click', clearDebug);
            addDebug('✓ Debug panel ready');
        }

        // Initialize ClipBrowser
        ClipBrowser.init();
        addDebug('✓ ClipBrowser initialized');

        addDebug('=== Navigation Panel Ready ===');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
