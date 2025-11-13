/**
 * EAV Ingest Assistant - Three-Panel Self-Contained Architecture
 * Components: ClipBrowser | ThumbnailViewer | MetadataForm
 */

// IMMEDIATE LOAD CONFIRMATION - This alert proves new code is executing
alert('✓ NEW panel-main.js loaded - Cache cleared successfully!');

// DIAGNOSTIC OVERLAY - Write directly to DOM
function addDiagnostic(message, isError) {
  let overlay = document.getElementById('diagnosticOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'diagnosticOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#000;color:#0f0;padding:10px;font-family:monospace;font-size:11px;z-index:9999;max-height:200px;overflow-y:auto;border-bottom:2px solid #0f0;';
    document.body.appendChild(overlay);
  }
  const line = document.createElement('div');
  line.textContent = new Date().toTimeString().substr(0,8) + ' ' + message;
  line.style.color = isError ? '#f00' : '#0f0';
  overlay.appendChild(line);
}

addDiagnostic('✓ Panel-main.js executing...');

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

(function() {
  'use strict';

  addDiagnostic('✓ IIFE started');

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
    filterHasMeta: false       // Show only tagged clips
  };

  addDiagnostic('✓ PanelState created');

  // Initialize CSInterface
  let csInterface;
  try {
    addDiagnostic('Attempting CSInterface initialization...');
    csInterface = new CSInterface();
    addDiagnostic('✓ CSInterface initialized: ' + typeof csInterface);
    addDiagnostic('✓ Version: ' + csInterface.getHostEnvironment().appVersion);
  } catch (e) {
    addDiagnostic('✗ CSInterface FAILED: ' + e.message, true);
    alert('Error: CSInterface not available. ' + e.message);
    return;
  }

  // ========================================
  // COMPONENT 1: CLIP BROWSER
  // ========================================

  const ClipBrowser = {
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
      addDiagnostic('[ClipBrowser] Starting init...');

      // Get DOM elements
      addDiagnostic('[ClipBrowser] Getting DOM elements...');
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
      addDiagnostic('[ClipBrowser] ✓ DOM elements retrieved');

      // Set up event listeners
      addDiagnostic('[ClipBrowser] Setting up event listeners...');
      this.setupEventListeners();
      addDiagnostic('[ClipBrowser] ✓ Event listeners set up');

      // Load all clips from project
      addDiagnostic('[ClipBrowser] About to call loadAllClips()...');
      this.loadAllClips();
      addDiagnostic('[ClipBrowser] ✓ loadAllClips() called');
    },

    setupEventListeners: function() {
      const self = this;

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
        console.log('[ClipBrowser] ========== CLIP CLICKED ==========');
        console.log('[ClipBrowser] Click target:', e.target);

        const clipItem = e.target.closest('.clip-item');
        console.log('[ClipBrowser] Found clip-item element:', clipItem);

        if (clipItem) {
          const nodeId = clipItem.getAttribute('data-clip-id');
          console.log('[ClipBrowser] Clip nodeId:', nodeId);
          self.selectClip(nodeId);
        } else {
          console.warn('[ClipBrowser] No clip-item found in click target hierarchy');
        }
      });
    },

    loadAllClips: function() {
      const self = this;
      addDiagnostic('[ClipBrowser] === LOADING CLIPS ===');
      addDiagnostic('[ClipBrowser] csInterface type: ' + typeof csInterface);

      if (!csInterface) {
        addDiagnostic('[ClipBrowser] ✗ csInterface not available!', true);
        self.showEmptyState('CSInterface not initialized');
        return;
      }

      // First test if ExtendScript is available
      addDiagnostic('[ClipBrowser] Testing ExtendScript...');
      csInterface.evalScript('typeof EAVIngest', function(testResult) {
        addDiagnostic('[ClipBrowser] typeof EAVIngest: ' + testResult);

        if (testResult === 'undefined') {
          addDiagnostic('[ClipBrowser] ✗ EAVIngest undefined!', true);
          self.showEmptyState('ExtendScript not loaded');
          return;
        }

        addDiagnostic('[ClipBrowser] ✓ EAVIngest available');
        addDiagnostic('[ClipBrowser] Calling getAllProjectClips...');

        csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
          addDiagnostic('[ClipBrowser] Callback fired! Result length: ' + (result ? result.length : 0));
          addDiagnostic('[ClipBrowser] First 100 chars: ' + (result ? result.substring(0,100) : 'null'));

          try {
            const data = JSON.parse(result);
            console.log('[ClipBrowser] getAllProjectClips parsed data:', data);

            if (data.error) {
              console.error('[ClipBrowser] ✗ Error loading clips:', data.error);
              self.showEmptyState(data.error);
              return;
            }

            if (data.clips && data.clips.length > 0) {
              // Filter out any clips without nodeId
              const validClips = data.clips.filter(function(clip) {
                if (!clip.nodeId) {
                  console.warn('[ClipBrowser] Skipping clip without nodeId:', clip);
                  return false;
                }
                return true;
              });

              if (validClips.length === 0) {
                console.warn('[ClipBrowser] No valid clips found (all missing nodeId)');
                self.showEmptyState('No valid clips in project');
                return;
              }

              PanelState.allClips = validClips;
              console.log('[ClipBrowser] ✓ Loaded', validClips.length, 'valid clips');
              console.log('[ClipBrowser] First clip:', validClips[0]);
              self.render();

              // Auto-select first clip if none selected
              if (!PanelState.currentClip && validClips.length > 0) {
                console.log('[ClipBrowser] Auto-selecting first clip with nodeId:', validClips[0].nodeId);
                self.selectClip(validClips[0].nodeId);
              }
            } else {
              console.warn('[ClipBrowser] No clips found in project');
              self.showEmptyState('No clips in project');
            }
          } catch (e) {
            console.error('[ClipBrowser] ✗ JSON Parse error:', e);
            console.error('[ClipBrowser] Raw result was:', result);
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

      const html = filteredClips.map(function(clip) {
        // Skip clips without nodeId (safety check)
        if (!clip.nodeId) {
          console.warn('[ClipBrowser] Skipping render of clip without nodeId:', clip);
          return '';
        }

        const isSelected = PanelState.currentClip && clip.nodeId === PanelState.currentClip.nodeId;
        const hasMetadata = clip.shot || clip.description || clip.tapeName;
        const statusIcon = hasMetadata ? '✓' : '•';
        const statusClass = hasMetadata ? 'tagged' : 'untagged';

        return '<div class="clip-item' + (isSelected ? ' selected' : '') + '" ' +
                       'data-clip-id="' + clip.nodeId + '" ' +
                       'role="listitem" tabindex="0">' +
                       '<span class="status-icon ' + statusClass + '">' + statusIcon + '</span>' +
                       '<span class="clip-name" title="' + (clip.name || 'Unknown') + '">' + (clip.name || 'Unknown') + '</span>' +
                       '</div>';
      }).join('');

      this.elements.clipList.innerHTML = html;
      this.elements.clipCount.textContent = filteredClips.length + ' clip' + (filteredClips.length === 1 ? '' : 's');
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

        // Metadata filter
        const hasMetadata = clip.shot || clip.description || clip.tapeName;
        if (PanelState.filterHasMeta && !hasMetadata) {return false;}

        return true;
      });
    },

    selectClip: function(nodeId) {
      console.log('[ClipBrowser] ========== SELECT CLIP ==========');
      console.log('[ClipBrowser] Selecting nodeId:', nodeId);

      // Validate nodeId
      if (!nodeId || nodeId === 'undefined' || nodeId === 'null') {
        console.error('[ClipBrowser] ✗ Invalid nodeId:', nodeId);
        return;
      }

      console.log('[ClipBrowser] Total clips in state:', PanelState.allClips.length);

      const clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
      if (!clip) {
        console.error('[ClipBrowser] ✗ Clip not found for nodeId:', nodeId);
        return;
      }

      // Double-check clip has valid nodeId
      if (!clip.nodeId) {
        console.error('[ClipBrowser] ✗ Found clip but it has no nodeId:', clip);
        return;
      }

      const index = PanelState.allClips.indexOf(clip);
      PanelState.currentClip = clip;
      PanelState.currentClipIndex = index;

      console.log('[ClipBrowser] ✓ Selected clip:', clip.name, '(index:', index, ')');
      console.log('[ClipBrowser] Full clip object:', clip);

      // Emit custom event for other components
      console.log('[ClipBrowser] Dispatching clip-selected event...');
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

  const ThumbnailViewer = {
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
      const self = this;

      // Listen for clip selection
      document.addEventListener('clip-selected', function(e) {
        console.log('[ThumbnailViewer] Received clip-selected event');
        console.log('[ThumbnailViewer] Event detail:', e.detail);
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
      const self = this;
      console.log('[ThumbnailViewer] ========== LOADING CLIP ==========');

      // Validate clip object
      if (!clip) {
        console.error('[ThumbnailViewer] ✗ Clip is null or undefined');
        this.showStatus('Error: No clip provided', 'error');
        return;
      }

      if (!clip.nodeId) {
        console.error('[ThumbnailViewer] ✗ Clip nodeId is missing');
        console.error('[ThumbnailViewer] Clip object:', clip);
        this.showStatus('Error: Invalid clip data', 'error');
        return;
      }

      console.log('[ThumbnailViewer] Clip name:', clip.name);
      console.log('[ThumbnailViewer] Clip nodeId:', clip.nodeId);
      console.log('[ThumbnailViewer] Clip treePath:', clip.treePath);

      // Show placeholder (no thumbnail needed - using Source Monitor)
      this.elements.placeholder.style.display = 'flex';
      this.elements.image.style.display = 'none';

      // Update clip info
      this.elements.clipName.textContent = clip.name || 'Unknown';
      this.elements.clipDetails.textContent = clip.treePath || 'Project';

      // Enable buttons
      this.elements.openSourceBtn.disabled = false;

      console.log('[ThumbnailViewer] Buttons enabled');

      // AUTO-OPEN IN SOURCE MONITOR (instead of frame extraction)
      this.showStatus('Opening in Source Monitor...', 'info');
      console.log('[ThumbnailViewer] Calling openInSourceMonitor with nodeId:', clip.nodeId);

      // SECURITY: Escape nodeId to prevent code injection
      const escapedNodeId = escapeForEvalScript(clip.nodeId);
      csInterface.evalScript('EAVIngest.openInSourceMonitor("' + escapedNodeId + '")', function(result) {
        console.log('[ThumbnailViewer] openInSourceMonitor raw result:', result);

        try {
          const data = JSON.parse(result);
          console.log('[ThumbnailViewer] openInSourceMonitor parsed data:', data);

          if (data.success) {
            console.log('[ThumbnailViewer] ✓ Opened in Source Monitor successfully');
            self.showStatus('✓ Opened in Source Monitor', 'success');
          } else {
            console.error('[ThumbnailViewer] ✗ Failed to open:', data.error);
            self.showStatus('Error: ' + (data.error || 'Unknown error'), 'error');
          }
        } catch (e) {
          console.error('[ThumbnailViewer] ✗ JSON Parse error:', e);
          console.error('[ThumbnailViewer] Raw result was:', result);
          self.showStatus('Failed to open in Source Monitor', 'error');
        }
      });
    },

    displayFrame: function(framePath) {
      // Convert to file:// URL
      const fileUrl = this.formatFileUrl(framePath);
      console.log('[ThumbnailViewer] Displaying frame:', fileUrl);

      // Hide placeholder, show image
      this.elements.placeholder.style.display = 'none';
      this.elements.image.style.display = 'block';

      // Set image source
      this.elements.image.src = fileUrl;
    },

    formatFileUrl: function(filePath) {
      // Cross-platform path normalization
      let normalized = filePath;

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
      const self = this;

      if (!PanelState.currentClip) {return;}

      console.log('[ThumbnailViewer] Opening in Source Monitor:', PanelState.currentClip.name);

      // SECURITY: Escape nodeId to prevent code injection
      const escapedNodeId = escapeForEvalScript(PanelState.currentClip.nodeId);
      csInterface.evalScript('EAVIngest.openInSourceMonitor("' + escapedNodeId + '")', function(result) {
        try {
          const data = JSON.parse(result);

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

  const MetadataForm = {
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
      const self = this;

      // Listen for clip selection
      document.addEventListener('clip-selected', function(e) {
        console.log('[MetadataForm] Received clip-selected event');
        console.log('[MetadataForm] Event detail:', e.detail);
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
      console.log('[MetadataForm] ========== LOADING CLIP INTO FORM ==========');

      // Validate clip object
      if (!clip) {
        console.error('[MetadataForm] ✗ Clip is null or undefined');
        return;
      }

      if (!clip.nodeId) {
        console.error('[MetadataForm] ✗ Clip nodeId is missing');
        console.error('[MetadataForm] Clip object:', clip);
        return;
      }

      console.log('[MetadataForm] Clip name:', clip.name);
      console.log('[MetadataForm] Clip nodeId:', clip.nodeId);

      // Update header
      this.elements.formClipName.textContent = clip.name;

      // Parse ID from filename (8-digit pattern)
      const idMatch = clip.name.match(/^(\d{8})/);
      this.elements.id.value = idMatch ? idMatch[1] : '';

      // Parse structured components from name
      const components = this.parseStructuredComponents(clip.name);

      this.elements.location.value = components.location || '';
      this.elements.subject.value = components.subject || '';
      this.elements.action.value = components.action || '';
      this.elements.shotType.value = components.shotType || '';

      // Load Description field as metadata tags
      this.elements.metadata.value = clip.description || '';

      // Show/hide action field based on type (heuristic: video files have action)
      const isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
      this.elements.actionGroup.style.display = isVideo ? 'block' : 'none';

      // Update generated name preview
      this.updateGeneratedName();

      // Enable buttons
      this.elements.applyBtn.disabled = false;
      this.updateNavigationButtons();
    },

    parseStructuredComponents: function(name) {
      // Remove extension
      const nameWithoutExt = name.replace(/\.[^.]+$/, '');

      // Split by hyphen
      const parts = nameWithoutExt.split('-');

      if (parts.length < 2) {
        return {};
      }

      const components = {};

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
      const id = this.elements.id.value;
      const location = this.elements.location.value.trim();
      const subject = this.elements.subject.value.trim();
      const action = this.elements.action.value.trim();
      const shotType = this.elements.shotType.value;

      const parts = [];

      if (id) {parts.push(id);}
      if (location) {parts.push(location);}
      if (subject) {parts.push(subject);}

      // Include action only if visible (videos)
      if (this.elements.actionGroup.style.display !== 'none' && action) {
        parts.push(action);
      }

      if (shotType) {parts.push(shotType);}

      const generatedName = parts.length > 0 ? parts.join('-') : '-';
      this.elements.generatedName.textContent = generatedName;
    },

    applyMetadata: function() {
      const self = this;
      console.log('[MetadataForm] ========== APPLY METADATA ==========');

      if (!PanelState.currentClip) {
        console.error('[MetadataForm] ✗ No clip selected');
        this.showStatus('No clip selected', 'error');
        return;
      }

      console.log('[MetadataForm] Current clip:', PanelState.currentClip.name);
      console.log('[MetadataForm] Current clip nodeId:', PanelState.currentClip.nodeId);

      // Build the generated name
      const generatedName = this.elements.generatedName.textContent;
      console.log('[MetadataForm] Generated name:', generatedName);

      if (generatedName === '-') {
        console.error('[MetadataForm] ✗ No fields filled in');
        this.showStatus('Please fill in at least one field', 'error');
        return;
      }

      // Prepare metadata object
      const metadata = {
        name: generatedName,
        tapeName: PanelState.currentClip.name, // Preserve original filename
        description: this.elements.metadata.value.trim(),
        shot: this.elements.shotType.value
      };

      console.log('[MetadataForm] Metadata object:', metadata);

      this.showStatus('Updating Premiere Pro...', 'info');

      // Call ExtendScript to update PP
      // Properly format the metadata object for ExtendScript using JSON.parse with single quotes
      const metadataJson = JSON.stringify(metadata);
      console.log('[MetadataForm] Metadata JSON:', metadataJson);

      const script = 'EAVIngest.updateClipMetadata("' + PanelState.currentClip.nodeId + '", JSON.parse(\'' + metadataJson.replace(/'/g, '\\\'') + '\'))';
      console.log('[MetadataForm] ExtendScript to execute:', script);

      csInterface.evalScript(script, function(result) {
        console.log('[MetadataForm] updateClipMetadata raw result:', result);

        try {
          const data = JSON.parse(result);
          console.log('[MetadataForm] updateClipMetadata parsed data:', data);

          if (data.success) {
            console.log('[MetadataForm] ✓ Metadata updated successfully');
            console.log('[MetadataForm] Updated name:', data.updatedName);
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
            console.error('[MetadataForm] ✗ Update failed:', data.error);
            self.showStatus('Error: ' + (data.error || 'Unknown error'), 'error');
          }
        } catch (e) {
          console.error('[MetadataForm] ✗ JSON Parse error:', e);
          console.error('[MetadataForm] Raw result was:', result);
          self.showStatus('Error updating Premiere Pro', 'error');
        }
      });
    },

    navigateToPrevious: function() {
      if (PanelState.currentClipIndex > 0) {
        const prevClip = PanelState.allClips[PanelState.currentClipIndex - 1];
        ClipBrowser.selectClip(prevClip.nodeId);
      }
    },

    navigateToNext: function() {
      if (PanelState.currentClipIndex < PanelState.allClips.length - 1) {
        const nextClip = PanelState.allClips[PanelState.currentClipIndex + 1];
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
    console.log('[Panel] ========================================');
    console.log('[Panel] Initializing Components...');
    console.log('[Panel] ========================================');

    // Initialize all components
    console.log('[Panel] 1. Initializing ClipBrowser...');
    ClipBrowser.init();
    console.log('[Panel] 2. Initializing ThumbnailViewer...');
    ThumbnailViewer.init();
    console.log('[Panel] 3. Initializing MetadataForm...');
    MetadataForm.init();

    console.log('[Panel] ========================================');
    console.log('[Panel] ✓ All components initialized successfully');
    console.log('[Panel] ========================================');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ========================================
  // GLOBAL DEBUGGING INTERFACE (temporary)
  // ========================================
  window.EAVDebug = {
    state: PanelState,
    csInterface: csInterface,
    ClipBrowser: ClipBrowser,
    testExtendScript: function() {
      console.log('[DEBUG] Testing ExtendScript connection...');
      csInterface.evalScript('typeof EAVIngest', function(result) {
        console.log('[DEBUG] typeof EAVIngest:', result);
        if (result === 'object') {
          console.log('[DEBUG] ✓ EAVIngest is available, testing getAllProjectClips...');
          csInterface.evalScript('EAVIngest.getAllProjectClips()', function(clipsResult) {
            console.log('[DEBUG] === RAW RESULT ===');
            console.log('[DEBUG] Type:', typeof clipsResult);
            console.log('[DEBUG] Length:', clipsResult.length);
            console.log('[DEBUG] First 500 chars:', clipsResult.substring(0, 500));
            console.log('[DEBUG] Full result:', clipsResult);
            try {
              const parsed = JSON.parse(clipsResult);
              console.log('[DEBUG] ✓ Valid JSON, parsed:', parsed);
            } catch (e) {
              console.error('[DEBUG] ✗ JSON parse failed:', e);
            }
          });
        } else {
          console.error('[DEBUG] ✗ EAVIngest not available:', result);
        }
      });
    }
  };
  console.log('[Panel] ========================================');
  console.log('[Panel] Global EAVDebug interface exposed');
  console.log('[Panel] Run: EAVDebug.testExtendScript()');
  console.log('[Panel] Check: EAVDebug.state.allClips');
  console.log('[Panel] ========================================');

})();
