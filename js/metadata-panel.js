/**
 * EAV Ingest Assistant - Metadata Panel
 * Component: Metadata Form with save functionality + Debug Panel
 */

(function() {
  'use strict';

  // ========================================
  // GLOBAL STATE
  // ========================================

  let currentClip = null;
  const navigationContext = {
    clipIndex: -1,
    totalClips: 0,
    filteredClips: []
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
  // COMPONENT: METADATA FORM
  // ========================================

  const MetadataForm = {
    elements: {
      formClipName: null,
      identifier: null,
      description: null,
      good: null,
      location: null,
      subject: null,
      action: null,
      shotType: null,
      actionGroup: null,
      generatedName: null,
      prevBtn: null,
      applyBtn: null,
      nextBtn: null,
      status: null
    },

    init: function() {
      addDebug('[MetadataForm] Starting init...');

      // Get DOM elements
      this.elements = {
        formClipName: document.getElementById('formClipName'),
        identifier: document.getElementById('metadataTapeName'),
        description: document.getElementById('metadataDescription'),
        good: document.getElementById('metadataGood'),
        location: document.getElementById('metadataLocation'),
        subject: document.getElementById('metadataSubject'),
        action: document.getElementById('metadataAction'),
        shotType: document.getElementById('metadataShotType'),
        actionGroup: document.getElementById('actionGroup'),
        generatedName: document.getElementById('generatedName'),
        prevBtn: document.getElementById('prevBtn'),
        applyBtn: document.getElementById('applyBtn'),
        nextBtn: document.getElementById('nextBtn'),
        status: document.getElementById('formStatus')
      };
      addDebug('[MetadataForm] ✓ DOM elements retrieved');

      // Set up event listeners
      this.setupEventListeners();
      addDebug('[MetadataForm] ✓ Event listeners set up');
    },

    setupEventListeners: function() {
      const self = this;

      // Listen for clip selection from Navigation Panel (CEP event)
      csInterface.addEventListener('com.elevana.clip-selected', function(event) {
        addDebug('[MetadataForm] Received CEP clip-selected event');
        try {
          // Parse event data (might be string or already parsed object)
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          // Handle both old format (just clip) and new format (clip + navigation context)
          let clip, clipIndex, totalClips, filteredClips;
          if (data.clip) {
            // New format: {clip, clipIndex, totalClips, filteredClips}
            clip = data.clip;
            clipIndex = data.clipIndex;
            totalClips = data.totalClips;
            filteredClips = data.filteredClips;
            addDebug('[MetadataForm] Navigation context: ' + clipIndex + '/' + totalClips);
          } else {
            // Old format: just clip object (backward compatibility)
            clip = data;
            clipIndex = -1;
            totalClips = 0;
            filteredClips = [];
          }

          // Store navigation context globally
          navigationContext.clipIndex = clipIndex;
          navigationContext.totalClips = totalClips;
          navigationContext.filteredClips = filteredClips;

          addDebug('[MetadataForm] Parsed clip: ' + clip.name);
          self.loadClipIntoForm(clip);
          self.updateNavigationButtons();
        } catch (e) {
          addDebug('[MetadataForm] ✗ Failed to parse event data: ' + e.message, true);
          addDebug('[MetadataForm] Event data type: ' + typeof event.data, true);
          addDebug('[MetadataForm] Event data: ' + event.data, true);
        }
      });

      // Form field changes - update preview + enforce kebab-case (no spaces)
      this.elements.location.addEventListener('input', function(e) {
        self.enforceKebabCase(e.target);
        self.updateGeneratedName();
      });
      this.elements.subject.addEventListener('input', function(e) {
        self.enforceKebabCase(e.target);
        self.updateGeneratedName();
      });
      this.elements.action.addEventListener('input', function(e) {
        self.enforceKebabCase(e.target);
        self.updateGeneratedName();
      });

      // Setup searchable dropdown for Shot Type
      this.setupSearchableDropdown();

      // Apply button
      this.elements.applyBtn.addEventListener('click', function() {
        self.applyMetadata();
      });

      // Previous button
      this.elements.prevBtn.addEventListener('click', function() {
        self.navigatePrevious();
      });

      // Next button
      this.elements.nextBtn.addEventListener('click', function() {
        self.navigateNext();
      });
    },

    setupSearchableDropdown: function() {
      const self = this;
      const input = this.elements.shotType;
      const dropdown = document.getElementById('shotTypeDropdown');

      // Safety check - ensure elements exist
      if (!input || !dropdown) {
        addDebug('[MetadataForm] ⚠ Searchable dropdown elements not found', true);
        return;
      }

      const options = dropdown.querySelectorAll('.dropdown-option');
      const validValues = [];
      let previousValue = '';
      let highlightedIndex = -1;

      addDebug('[MetadataForm] ✓ Setting up searchable dropdown');

      // Collect valid values
      options.forEach(function(option) {
        validValues.push(option.getAttribute('data-value'));
      });

      // Show dropdown on focus
      input.addEventListener('focus', function() {
        previousValue = input.value;
        dropdown.style.display = 'block';
        filterOptions(input.value);
      });

      // Filter options as user types
      input.addEventListener('input', function() {
        filterOptions(input.value);
        self.updateGeneratedName(); // Update preview
      });

      // Handle keyboard navigation
      input.addEventListener('keydown', function(e) {
        const visibleOptions = Array.from(options).filter(function(opt) {
          return opt.style.display !== 'none';
        });

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
          updateHighlight(visibleOptions);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          highlightedIndex = Math.max(highlightedIndex - 1, 0);
          updateHighlight(visibleOptions);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
            selectOption(visibleOptions[highlightedIndex]);
          } else if (visibleOptions.length === 1) {
            selectOption(visibleOptions[0]);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          input.value = previousValue;
          dropdown.style.display = 'none';
          highlightedIndex = -1;
        }
      });

      // Handle option click
      options.forEach(function(option) {
        option.addEventListener('click', function() {
          selectOption(option);
        });
      });

      // Validate on blur
      input.addEventListener('blur', function(e) {
        // Delay to allow option click to register
        setTimeout(function() {
          const value = input.value.toUpperCase().trim();

          if (value && validValues.indexOf(value) === -1) {
            // Invalid value - revert to previous
            addDebug('[MetadataForm] ⚠ Invalid shot type: "' + value + '" - reverting', true);
            input.value = previousValue;
            self.updateGeneratedName();
          }

          dropdown.style.display = 'none';
          highlightedIndex = -1;
        }, 150);
      });

      // Filter options helper
      function filterOptions(searchTerm) {
        const search = searchTerm.toUpperCase().trim();
        let visibleCount = 0;
        highlightedIndex = -1;

        options.forEach(function(option) {
          const value = option.getAttribute('data-value');
          const text = option.textContent;

          if (!search || value.indexOf(search) === 0 || text.toUpperCase().indexOf(search) >= 0) {
            option.style.display = 'block';
            option.classList.remove('highlighted');
            visibleCount++;
          } else {
            option.style.display = 'none';
            option.classList.remove('highlighted');
          }
        });

        // Show "No matches" if no options visible
        if (visibleCount === 0 && search) {
          // Could add a "no matches" message here
        }
      }

      // Update highlight helper
      function updateHighlight(visibleOptions) {
        options.forEach(function(opt) {
          opt.classList.remove('highlighted');
        });

        if (highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
          visibleOptions[highlightedIndex].classList.add('highlighted');
          visibleOptions[highlightedIndex].scrollIntoView({ block: 'nearest' });
        }
      }

      // Select option helper
      function selectOption(option) {
        const value = option.getAttribute('data-value');
        input.value = value;
        previousValue = value;
        dropdown.style.display = 'none';
        highlightedIndex = -1;
        addDebug('[MetadataForm] ✓ Shot Type selected: ' + value);
        self.updateGeneratedName();
      }
    },

    loadClipIntoForm: function(clip) {
      addDebug('[MetadataForm] Loading clip: ' + (clip ? clip.name : 'null'));

      // Validate clip object
      if (!clip) {
        addDebug('[MetadataForm] ✗ Clip is null', true);
        return;
      }

      if (!clip.nodeId) {
        addDebug('[MetadataForm] ✗ Clip nodeId missing', true);
        return;
      }

      currentClip = clip;

      // DEBUG: Show entire clip object structure
      addDebug('[MetadataForm] === CLIP OBJECT DEBUG ===');
      addDebug('[MetadataForm] clip.name: "' + (clip.name || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.identifier: "' + (clip.identifier || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.description: "' + (clip.description || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.good: "' + (clip.good || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.shot: "' + (clip.shot || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.location: "' + (clip.location || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.subject: "' + (clip.subject || 'EMPTY') + '"');
      addDebug('[MetadataForm] clip.action: "' + (clip.action || 'EMPTY') + '"');
      addDebug('[MetadataForm] === END DEBUG ===');

      // Update header
      this.elements.formClipName.textContent = clip.name;

      // Load Identifier from Dublin Core (or fall back to clip name)
      const identifierValue = clip.identifier || clip.name || '';
      this.elements.identifier.value = identifierValue;
      addDebug('[MetadataForm] → Identifier set to: "' + identifierValue + '"');

      // Load Description field
      const descriptionValue = clip.description || '';
      this.elements.description.value = descriptionValue;
      addDebug('[MetadataForm] → Description set to: "' + descriptionValue + '"');

      // Load Good checkbox (check if 'true' string or true boolean)
      const goodValue = (clip.good === 'true' || clip.good === true);
      this.elements.good.checked = goodValue;
      addDebug('[MetadataForm] → Good checkbox set to: ' + goodValue);

      // Load Location, Subject, Action, Shot Type from XMP (with fallback to filename parsing)
      if (clip.location || clip.subject || clip.action || clip.shot) {
        // XMP data exists - use it directly
        this.elements.location.value = clip.location || '';
        this.elements.subject.value = clip.subject || '';
        this.elements.action.value = clip.action || '';
        this.elements.shotType.value = clip.shot || '';
        addDebug('[MetadataForm] → Loaded from XMP metadata');
      } else {
        // Fallback: Parse from filename for clips without XMP metadata
        const components = this.parseStructuredComponents(clip.name);
        this.elements.location.value = components.location || '';
        this.elements.subject.value = components.subject || '';
        this.elements.action.value = components.action || '';
        this.elements.shotType.value = components.shotType || '';
        addDebug('[MetadataForm] → Parsed from filename (no XMP data)');
      }

      // Show/hide action field based on type (heuristic: video files have action)
      const isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
      this.elements.actionGroup.style.display = isVideo ? 'block' : 'none';

      // Update generated name preview
      this.updateGeneratedName();

      // Enable apply button
      this.elements.applyBtn.disabled = false;

      addDebug('[MetadataForm] ✓ Clip loaded into form');
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

    enforceKebabCase: function(inputElement) {
      // Replace spaces with hyphens in real-time (kebab-case enforcement)
      const cursorPos = inputElement.selectionStart;
      const oldValue = inputElement.value;
      const newValue = oldValue.replace(/ /g, '-');

      if (oldValue !== newValue) {
        inputElement.value = newValue;
        // Restore cursor position
        inputElement.setSelectionRange(cursorPos, cursorPos);
      }
    },

    updateGeneratedName: function() {
      const location = this.elements.location.value.trim();
      const subject = this.elements.subject.value.trim();
      const action = this.elements.action.value.trim();
      const shotType = this.elements.shotType.value;

      const parts = [];

      if (location) {parts.push(location);}
      if (subject) {parts.push(subject);}

      // Include action only if visible (videos)
      const actionVisible = this.elements.actionGroup.style.display !== 'none';
      if (actionVisible && action) {
        parts.push(action);
      }

      if (shotType) {parts.push(shotType);}

      const generatedName = parts.length > 0 ? parts.join('-') : '-';
      this.elements.generatedName.textContent = generatedName;
    },

    applyMetadata: function() {
      const self = this;
      addDebug('[MetadataForm] Applying metadata...');

      if (!currentClip) {
        addDebug('[MetadataForm] ✗ No clip selected', true);
        this.showStatus('No clip selected', 'error');
        return;
      }

      // Build the generated name
      const generatedName = this.elements.generatedName.textContent;

      if (generatedName === '-') {
        addDebug('[MetadataForm] ✗ No fields filled in', true);
        this.showStatus('Please fill in at least one field', 'error');
        return;
      }

      // Prepare metadata object
      const metadata = {
        name: generatedName,
        identifier: this.elements.identifier.value || currentClip.name,
        description: this.elements.description.value.trim(),
        shot: this.elements.shotType.value,
        good: this.elements.good.checked ? 'true' : 'false',
        location: this.elements.location.value.trim(),
        subject: this.elements.subject.value.trim(),
        action: this.elements.action.value.trim()
      };

      addDebug('[MetadataForm] Metadata: ' + JSON.stringify(metadata));
      this.showStatus('Updating Premiere Pro...', 'info');

      // Call ExtendScript to update PP
      // SECURITY: Escape nodeId to prevent code injection
      const metadataJson = JSON.stringify(metadata);
      const escapedNodeId = escapeForEvalScript(currentClip.nodeId);
      const escapedMetadataJson = metadataJson.replace(/'/g, '\\\'');
      const script = 'EAVIngest.updateClipMetadata("' + escapedNodeId + '", JSON.parse(\'' + escapedMetadataJson + '\'))';

      csInterface.evalScript(script, function(result) {
        try {
          const data = JSON.parse(result);

          if (data.success) {
            addDebug('[MetadataForm] ✓ Updated: ' + data.updatedName);

            // Display ExtendScript debug info
            if (data.debug && data.debug.length > 0) {
              addDebug('[ExtendScript Debug] ===== START =====');
              for (let i = 0; i < data.debug.length; i++) {
                addDebug('[ExtendScript] ' + data.debug[i]);
              }
              addDebug('[ExtendScript Debug] ===== END =====');
            }

            self.showStatus('✓ Updated: ' + data.updatedName, 'success');

            // Update current clip name in state
            currentClip.name = data.updatedName;

            // Emit CEP event to notify Navigation Panel
            try {
              const metadataEvent = new CSEvent('com.elevana.metadata-applied', 'APPLICATION');
              metadataEvent.data = JSON.stringify({ nodeId: currentClip.nodeId, name: data.updatedName });
              csInterface.dispatchEvent(metadataEvent);
              addDebug('[MetadataForm] ✓ CEP metadata-applied event dispatched');
            } catch (e) {
              addDebug('[MetadataForm] ✗ Failed to dispatch metadata event: ' + e.message, true);
            }
          } else {
            addDebug('[MetadataForm] ✗ Error: ' + data.error, true);
            self.showStatus('Error: ' + data.error, 'error');
          }
        } catch (e) {
          addDebug('[MetadataForm] ✗ Parse error: ' + e.message, true);
          self.showStatus('Failed to update metadata', 'error');
        }
      });
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
    },

    updateNavigationButtons: function() {
      const clipIndex = navigationContext.clipIndex;
      const totalClips = navigationContext.totalClips;

      addDebug('[MetadataForm] Updating navigation buttons: ' + clipIndex + '/' + totalClips);

      // Enable/disable Previous button
      this.elements.prevBtn.disabled = (clipIndex <= 0);

      // Enable/disable Next button
      this.elements.nextBtn.disabled = (clipIndex >= totalClips - 1);
    },

    navigatePrevious: function() {
      const clipIndex = navigationContext.clipIndex;
      const filteredClips = navigationContext.filteredClips;

      if (clipIndex > 0 && filteredClips.length > 0) {
        const previousClip = filteredClips[clipIndex - 1];
        addDebug('[MetadataForm] ◀ Navigating to previous clip: ' + previousClip.name);

        // Dispatch CEP event to select this clip in Navigation Panel
        try {
          const event = new CSEvent('com.elevana.clip-selected', 'APPLICATION');
          event.data = JSON.stringify({
            clip: previousClip,
            clipIndex: clipIndex - 1,
            totalClips: filteredClips.length,
            filteredClips: filteredClips
          });
          csInterface.dispatchEvent(event);
        } catch (e) {
          addDebug('[MetadataForm] ✗ Failed to navigate previous: ' + e.message, true);
        }
      }
    },

    navigateNext: function() {
      const clipIndex = navigationContext.clipIndex;
      const filteredClips = navigationContext.filteredClips;

      if (clipIndex < filteredClips.length - 1 && filteredClips.length > 0) {
        const nextClip = filteredClips[clipIndex + 1];
        addDebug('[MetadataForm] ▶ Navigating to next clip: ' + nextClip.name);

        // Dispatch CEP event to select this clip in Navigation Panel
        try {
          const event = new CSEvent('com.elevana.clip-selected', 'APPLICATION');
          event.data = JSON.stringify({
            clip: nextClip,
            clipIndex: clipIndex + 1,
            totalClips: filteredClips.length,
            filteredClips: filteredClips
          });
          csInterface.dispatchEvent(event);
        } catch (e) {
          addDebug('[MetadataForm] ✗ Failed to navigate next: ' + e.message, true);
        }
      }
    }
  };

  // ========================================
  // INITIALIZATION
  // ========================================

  function init() {
    addDebug('=== Metadata Panel Initializing ===');

    // Initialize Debug Panel clear button
    const clearDebugBtn = document.getElementById('clearDebug');
    if (clearDebugBtn) {
      clearDebugBtn.addEventListener('click', clearDebug);
      addDebug('✓ Debug panel ready');
    }

    // Initialize MetadataForm
    MetadataForm.init();
    addDebug('✓ MetadataForm initialized');

    addDebug('=== Metadata Panel Ready ===');
    addDebug('Waiting for clip selection from Navigation Panel...');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
