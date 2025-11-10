/**
 * EAV Ingest Assistant - Three-Panel Self-Contained Architecture
 * Components: ClipBrowser | ThumbnailViewer | MetadataForm
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
        filterHasMeta: false       // Show only tagged clips
    };

    // Initialize CSInterface
    var csInterface;
    try {
        csInterface = new CSInterface();
        console.log('[Panel] CSInterface initialized');
    } catch (e) {
        console.error('[Panel] Failed to initialize CSInterface:', e);
        alert('Error: CSInterface not available. Please ensure this panel is running in Premiere Pro.');
        return;
    }

    // ========================================
    // COMPONENT 1: CLIP BROWSER
    // ========================================

    var ClipBrowser = {
        elements: {
            searchInput: null,
            clearSearchBtn: null,
            filterVideo: null,
            filterImage: null,
            filterHasMeta: null,
            clipList: null,
            clipCount: null,
            refreshBtn: null
        },

        init: function() {
            console.log('[ClipBrowser] Initializing...');

            // Get DOM elements
            this.elements = {
                searchInput: document.getElementById('clipSearch'),
                clearSearchBtn: document.getElementById('clearSearch'),
                filterVideo: document.getElementById('filterVideo'),
                filterImage: document.getElementById('filterImage'),
                filterHasMeta: document.getElementById('filterHasMeta'),
                clipList: document.getElementById('clipList'),
                clipCount: document.getElementById('clipCount'),
                refreshBtn: document.getElementById('refreshClips')
            };

            // Set up event listeners
            this.setupEventListeners();

            // Load all clips from project
            this.loadAllClips();
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

            // Refresh button
            this.elements.refreshBtn.addEventListener('click', function() {
                self.loadAllClips();
            });

            // Clip list click handling (event delegation)
            this.elements.clipList.addEventListener('click', function(e) {
                var clipItem = e.target.closest('.clip-item');
                if (clipItem) {
                    var nodeId = clipItem.getAttribute('data-clip-id');
                    self.selectClip(nodeId);
                }
            });
        },

        loadAllClips: function() {
            var self = this;
            console.log('[ClipBrowser] Loading all clips...');

            csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
                try {
                    var data = JSON.parse(result);

                    if (data.error) {
                        console.error('[ClipBrowser] Error loading clips:', data.error);
                        self.showEmptyState(data.error);
                        return;
                    }

                    if (data.clips && data.clips.length > 0) {
                        PanelState.allClips = data.clips;
                        console.log('[ClipBrowser] Loaded', data.clips.length, 'clips');
                        self.render();

                        // Auto-select first clip if none selected
                        if (!PanelState.currentClip && data.clips.length > 0) {
                            self.selectClip(data.clips[0].nodeId);
                        }
                    } else {
                        self.showEmptyState('No clips in project');
                    }
                } catch (e) {
                    console.error('[ClipBrowser] Parse error:', e);
                    self.showEmptyState('Failed to load clips');
                }
            });
        },

        render: function() {
            var filteredClips = this.getFilteredClips();

            if (filteredClips.length === 0) {
                this.showEmptyState('No clips match filters');
                return;
            }

            var html = filteredClips.map(function(clip) {
                var isSelected = PanelState.currentClip && clip.nodeId === PanelState.currentClip.nodeId;
                var hasMetadata = clip.shot || clip.description || clip.tapeName;
                var statusIcon = hasMetadata ? '✓' : '•';
                var statusClass = hasMetadata ? 'tagged' : 'untagged';

                return '<div class="clip-item' + (isSelected ? ' selected' : '') + '" ' +
                       'data-clip-id="' + clip.nodeId + '" ' +
                       'role="listitem" tabindex="0">' +
                       '<span class="status-icon ' + statusClass + '">' + statusIcon + '</span>' +
                       '<span class="clip-name" title="' + clip.name + '">' + clip.name + '</span>' +
                       '</div>';
            }).join('');

            this.elements.clipList.innerHTML = html;
            this.elements.clipCount.textContent = filteredClips.length + ' clip' + (filteredClips.length === 1 ? '' : 's');
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
                var hasMetadata = clip.shot || clip.description || clip.tapeName;
                if (PanelState.filterHasMeta && !hasMetadata) return false;

                return true;
            });
        },

        selectClip: function(nodeId) {
            var clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
            if (!clip) {
                console.warn('[ClipBrowser] Clip not found:', nodeId);
                return;
            }

            var index = PanelState.allClips.indexOf(clip);
            PanelState.currentClip = clip;
            PanelState.currentClipIndex = index;

            console.log('[ClipBrowser] Selected clip:', clip.name);

            // Emit custom event for other components
            document.dispatchEvent(new CustomEvent('clip-selected', {
                detail: clip
            }));

            // Re-render to update selection UI
            this.render();
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
    // COMPONENT 2: THUMBNAIL VIEWER
    // ========================================

    var ThumbnailViewer = {
        elements: {
            placeholder: null,
            image: null,
            clipName: null,
            clipDetails: null,
            openSourceBtn: null,
            status: null
        },

        init: function() {
            console.log('[ThumbnailViewer] Initializing...');

            // Get DOM elements
            this.elements = {
                placeholder: document.getElementById('thumbnailPlaceholder'),
                image: document.getElementById('thumbnailImage'),
                clipName: document.getElementById('thumbnailClipName'),
                clipDetails: document.getElementById('thumbnailClipDetails'),
                openSourceBtn: document.getElementById('openSourceBtn'),
                status: document.getElementById('thumbnailStatus')
            };

            // Set up event listeners
            this.setupEventListeners();
        },

        setupEventListeners: function() {
            var self = this;

            // Listen for clip selection
            document.addEventListener('clip-selected', function(e) {
                self.loadClip(e.detail);
            });

            // Open in Source Monitor
            this.elements.openSourceBtn.addEventListener('click', function() {
                if (PanelState.currentClip) {
                    self.openInSourceMonitor();
                }
            });
        },

        loadClip: function(clip) {
            var self = this;
            console.log('[ThumbnailViewer] Loading clip:', clip.name);

            // Show placeholder, hide image
            this.elements.placeholder.style.display = 'flex';
            this.elements.image.style.display = 'none';

            // Update clip info
            this.elements.clipName.textContent = clip.name;
            this.elements.clipDetails.textContent = clip.treePath || 'Project';

            // Enable buttons
            this.elements.openSourceBtn.disabled = false;

            // Show loading status
            this.showStatus('Extracting frame at 0.5s...', 'info');

            // Extract frame at 0.5 seconds
            csInterface.evalScript('EAVIngest.exportFrameAtTime("' + clip.nodeId + '", 0.5)', function(result) {
                try {
                    var data = JSON.parse(result);

                    if (data.success) {
                        console.log('[ThumbnailViewer] Frame extracted:', data.framePath);
                        self.displayFrame(data.framePath);
                        self.showStatus('Frame loaded', 'success');
                    } else {
                        console.error('[ThumbnailViewer] Frame extraction failed:', data.error);
                        self.showStatus('Frame extraction failed: ' + (data.error || 'Unknown error'), 'error');
                    }
                } catch (e) {
                    console.error('[ThumbnailViewer] Parse error:', e);
                    self.showStatus('Failed to extract frame', 'error');
                }
            });
        },

        displayFrame: function(framePath) {
            // Convert to file:// URL
            var fileUrl = this.formatFileUrl(framePath);
            console.log('[ThumbnailViewer] Displaying frame:', fileUrl);

            // Hide placeholder, show image
            this.elements.placeholder.style.display = 'none';
            this.elements.image.style.display = 'block';

            // Set image source
            this.elements.image.src = fileUrl;
        },

        formatFileUrl: function(filePath) {
            // Cross-platform path normalization
            var normalized = filePath;

            // Convert backslashes to forward slashes (Windows)
            normalized = normalized.replace(/\\/g, '/');

            // Ensure file:// protocol
            if (!normalized.startsWith('file://')) {
                // macOS/Linux absolute paths start with /
                if (normalized.startsWith('/')) {
                    normalized = 'file://' + normalized;
                }
                // Windows paths start with drive letter (C:/)
                else if (normalized.match(/^[A-Z]:\//i)) {
                    normalized = 'file:///' + normalized;
                }
            }

            // URL encode special characters
            normalized = normalized.replace(/#/g, '%23')
                                   .replace(/\?/g, '%3F')
                                   .replace(/\s/g, '%20');

            return normalized;
        },

        openInSourceMonitor: function() {
            var self = this;

            if (!PanelState.currentClip) return;

            console.log('[ThumbnailViewer] Opening in Source Monitor:', PanelState.currentClip.name);

            csInterface.evalScript('EAVIngest.openInSourceMonitor("' + PanelState.currentClip.nodeId + '")', function(result) {
                try {
                    var data = JSON.parse(result);

                    if (data.success) {
                        self.showStatus('Opened in Source Monitor', 'success');
                    } else {
                        self.showStatus('Error: ' + (data.error || 'Unknown error'), 'error');
                    }
                } catch (e) {
                    console.error('[ThumbnailViewer] Error opening in Source Monitor:', e);
                    self.showStatus('Failed to open in Source Monitor', 'error');
                }
            });
        },

        showStatus: function(message, type) {
            this.elements.status.textContent = message;
            this.elements.status.className = 'thumbnail-status ' + type;

            // Auto-clear success/info messages
            if (type === 'success' || type === 'info') {
                setTimeout(function() {
                    this.elements.status.textContent = '';
                    this.elements.status.className = 'thumbnail-status';
                }.bind(this), 3000);
            }
        }
    };

    // ========================================
    // COMPONENT 3: METADATA FORM
    // ========================================

    var MetadataForm = {
        elements: {
            formClipName: null,
            id: null,
            location: null,
            subject: null,
            action: null,
            shotType: null,
            metadata: null,
            actionGroup: null,
            generatedName: null,
            prevBtn: null,
            nextBtn: null,
            applyBtn: null,
            status: null
        },

        init: function() {
            console.log('[MetadataForm] Initializing...');

            // Get DOM elements
            this.elements = {
                formClipName: document.getElementById('formClipName'),
                id: document.getElementById('id'),
                location: document.getElementById('location'),
                subject: document.getElementById('subject'),
                action: document.getElementById('action'),
                shotType: document.getElementById('shotType'),
                metadata: document.getElementById('metadata'),
                actionGroup: document.getElementById('actionGroup'),
                generatedName: document.getElementById('generatedName'),
                prevBtn: document.getElementById('prevBtn'),
                nextBtn: document.getElementById('nextBtn'),
                applyBtn: document.getElementById('applyBtn'),
                status: document.getElementById('formStatus')
            };

            // Set up event listeners
            this.setupEventListeners();
        },

        setupEventListeners: function() {
            var self = this;

            // Listen for clip selection
            document.addEventListener('clip-selected', function(e) {
                self.loadClipIntoForm(e.detail);
            });

            // Form field changes - update preview
            this.elements.location.addEventListener('input', function() { self.updateGeneratedName(); });
            this.elements.subject.addEventListener('input', function() { self.updateGeneratedName(); });
            this.elements.action.addEventListener('input', function() { self.updateGeneratedName(); });
            this.elements.shotType.addEventListener('change', function() { self.updateGeneratedName(); });

            // Navigation buttons
            this.elements.prevBtn.addEventListener('click', function() {
                self.navigateToPrevious();
            });

            this.elements.nextBtn.addEventListener('click', function() {
                self.navigateToNext();
            });

            // Apply button
            this.elements.applyBtn.addEventListener('click', function() {
                self.applyMetadata();
            });
        },

        loadClipIntoForm: function(clip) {
            console.log('[MetadataForm] Loading clip into form:', clip.name);

            // Update header
            this.elements.formClipName.textContent = clip.name;

            // Parse ID from filename (8-digit pattern)
            var idMatch = clip.name.match(/^(\d{8})/);
            this.elements.id.value = idMatch ? idMatch[1] : '';

            // Parse structured components from name
            var components = this.parseStructuredComponents(clip.name);

            this.elements.location.value = components.location || '';
            this.elements.subject.value = components.subject || '';
            this.elements.action.value = components.action || '';
            this.elements.shotType.value = components.shotType || '';

            // Load Description field as metadata tags
            this.elements.metadata.value = clip.description || '';

            // Show/hide action field based on type (heuristic: video files have action)
            var isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
            this.elements.actionGroup.style.display = isVideo ? 'block' : 'none';

            // Update generated name preview
            this.updateGeneratedName();

            // Enable buttons
            this.elements.applyBtn.disabled = false;
            this.updateNavigationButtons();
        },

        parseStructuredComponents: function(name) {
            // Remove extension
            var nameWithoutExt = name.replace(/\.[^.]+$/, '');

            // Split by hyphen
            var parts = nameWithoutExt.split('-');

            if (parts.length < 2) {
                return {};
            }

            var components = {};

            if (parts.length >= 5) {
                // Video format: id-location-subject-action-shotType
                components.location = parts[1] || '';
                components.subject = parts[2] || '';
                components.action = parts[3] || '';
                components.shotType = parts[4] || '';
            } else if (parts.length === 4) {
                // Image format: id-location-subject-shotType
                components.location = parts[1] || '';
                components.subject = parts[2] || '';
                components.shotType = parts[3] || '';
            }

            return components;
        },

        updateGeneratedName: function() {
            var id = this.elements.id.value;
            var location = this.elements.location.value.trim();
            var subject = this.elements.subject.value.trim();
            var action = this.elements.action.value.trim();
            var shotType = this.elements.shotType.value;

            var parts = [];

            if (id) parts.push(id);
            if (location) parts.push(location);
            if (subject) parts.push(subject);

            // Include action only if visible (videos)
            if (this.elements.actionGroup.style.display !== 'none' && action) {
                parts.push(action);
            }

            if (shotType) parts.push(shotType);

            var generatedName = parts.length > 0 ? parts.join('-') : '-';
            this.elements.generatedName.textContent = generatedName;
        },

        applyMetadata: function() {
            var self = this;

            if (!PanelState.currentClip) {
                this.showStatus('No clip selected', 'error');
                return;
            }

            // Build the generated name
            var generatedName = this.elements.generatedName.textContent;
            if (generatedName === '-') {
                this.showStatus('Please fill in at least one field', 'error');
                return;
            }

            // Prepare metadata object
            var metadata = {
                name: generatedName,
                tapeName: PanelState.currentClip.name, // Preserve original filename
                description: this.elements.metadata.value.trim(),
                shot: this.elements.shotType.value
            };

            this.showStatus('Updating Premiere Pro...', 'info');

            // Call ExtendScript to update PP
            // Properly format the metadata object for ExtendScript using JSON.parse with single quotes
            var metadataJson = JSON.stringify(metadata);
            var script = 'EAVIngest.updateClipMetadata("' + PanelState.currentClip.nodeId + '", JSON.parse(\'' + metadataJson.replace(/'/g, "\\'") + '\'))';

            csInterface.evalScript(script, function(result) {
                try {
                    var data = JSON.parse(result);

                    if (data.success) {
                        self.showStatus('✓ Updated: ' + data.updatedName, 'success');

                        // Update current clip name in state
                        PanelState.currentClip.name = data.updatedName;

                        // Emit event to update clip browser
                        document.dispatchEvent(new CustomEvent('metadata-applied', {
                            detail: { nodeId: PanelState.currentClip.nodeId }
                        }));

                        // Optionally auto-advance to next clip
                        // setTimeout(function() { self.navigateToNext(); }, 1000);
                    } else {
                        self.showStatus('Error: ' + (data.error || 'Unknown error'), 'error');
                    }
                } catch (e) {
                    console.error('[MetadataForm] Error applying metadata:', e);
                    self.showStatus('Error updating Premiere Pro', 'error');
                }
            });
        },

        navigateToPrevious: function() {
            if (PanelState.currentClipIndex > 0) {
                var prevClip = PanelState.allClips[PanelState.currentClipIndex - 1];
                ClipBrowser.selectClip(prevClip.nodeId);
            }
        },

        navigateToNext: function() {
            if (PanelState.currentClipIndex < PanelState.allClips.length - 1) {
                var nextClip = PanelState.allClips[PanelState.currentClipIndex + 1];
                ClipBrowser.selectClip(nextClip.nodeId);
            }
        },

        updateNavigationButtons: function() {
            this.elements.prevBtn.disabled = PanelState.currentClipIndex <= 0;
            this.elements.nextBtn.disabled = PanelState.currentClipIndex >= PanelState.allClips.length - 1 || PanelState.allClips.length === 0;
        },

        showStatus: function(message, type) {
            this.elements.status.textContent = message;
            this.elements.status.className = 'form-status ' + type;

            // Auto-clear success/info messages
            if (type === 'success' || type === 'info') {
                setTimeout(function() {
                    this.elements.status.textContent = '';
                    this.elements.status.className = 'form-status';
                }.bind(this), 3000);
            }
        }
    };

    // ========================================
    // PANEL INITIALIZATION
    // ========================================

    function init() {
        console.log('[Panel] Initializing EAV Ingest Assistant...');

        // Initialize all components
        ClipBrowser.init();
        ThumbnailViewer.init();
        MetadataForm.init();

        console.log('[Panel] All components initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
