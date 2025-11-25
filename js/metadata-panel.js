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
      input.addEventListener('blur', function(_e) {
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
      const self = this;
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

      // Update header
      this.elements.formClipName.textContent = clip.name;

      // Call Track A readJSONMetadataByNodeId with error capture AND path diagnostics
      const escapedNodeId = escapeForEvalScript(clip.nodeId);

      // Call EAVIngest API directly (helper functions are internal to module scope)
      const script = 'EAVIngest.readJSONMetadataByNodeId("' + escapedNodeId + '")';

      csInterface.evalScript(script, function(response) {
        const jsonString = response || 'null';
        addDebug('[MetadataForm] JSON response: ' + jsonString);

        // DIAGNOSTIC: Check for ExtendScript errors (captured by try/catch wrapper)
        if (jsonString && jsonString.indexOf('ERROR:') === 0) {
          addDebug('[MetadataForm] ✗ ExtendScript threw exception:', true);
          addDebug('[MetadataForm] → ' + jsonString, true);
          self.showError('ExtendScript error: ' + jsonString.substring(0, 100));
          self.clearFormFields();
          return;
        }

        // DIAGNOSTIC: Check for EvalScript execution failure (ExtendScript crashed or not loaded)
        if (jsonString === 'EvalScript error.') {
          addDebug('[MetadataForm] ✗ CRITICAL: ExtendScript execution failed', true);
          addDebug('[MetadataForm] → Possible causes:', true);
          addDebug('[MetadataForm]   1. EAVIngest namespace not loaded (jsx/host.jsx failed)', true);
          addDebug('[MetadataForm]   2. Track A integration missing (jsx/generated/track-a-integration.jsx)', true);
          addDebug('[MetadataForm]   3. ExtendScript syntax error or runtime exception', true);
          addDebug('[MetadataForm] → Check panel initialization logs above for ExtendScript loading status', true);
          self.showError('ExtendScript not available. Check Debug Panel for initialization errors.');
          self.clearFormFields();
          return;
        }

        // Handle JSON not found (offline scenario or no metadata file)
        if (jsonString === 'null' || !jsonString || jsonString.trim() === '') {
          addDebug('[MetadataForm] ✗ Metadata file not found', true);
          self.showError('Metadata file not found. Clip may be offline or not processed by Ingest Assistant.');
          self.clearFormFields();
          return;
        }

        try {
          // Parse JSON response
          const metadata = JSON.parse(jsonString);
          addDebug('[MetadataForm] ✓ Parsed JSON metadata');

          // Populate form fields from JSON
          self.elements.location.value = metadata.location || '';
          self.elements.subject.value = metadata.subject || '';
          self.elements.action.value = metadata.action || '';
          self.elements.shotType.value = metadata.shotType || '';

          // Handle keywords array (join with commas for display)
          const keywordsDisplay = (metadata.keywords || []).join(', ');
          self.elements.description.value = keywordsDisplay;
          addDebug('[MetadataForm] → Keywords: "' + keywordsDisplay + '"');

          // Set identifier (Tape Name from JSON or fall back to clip name)
          const identifierValue = metadata.originalFilename || metadata.id || clip.name || '';
          self.elements.identifier.value = identifierValue;
          addDebug('[MetadataForm] → Identifier: "' + identifierValue + '"');

          // Load Good checkbox (currently not in Schema R1.1, default to false)
          self.elements.good.checked = false;

          // Display computed shotName (read-only field - will be added to HTML)
          const shotNameDisplay = metadata.shotName || self.computeShotNameLocally(metadata);
          const shotNameElement = document.getElementById('shotNameDisplay');
          if (shotNameElement) {
            shotNameElement.value = shotNameDisplay;
          }
          addDebug('[MetadataForm] → shotName: "' + shotNameDisplay + '"');

          // Show lock indicator if folder completed
          if (metadata._completed || (metadata.lockedFields && metadata.lockedFields.length > 0)) {
            self.showLockIndicator(metadata.lockedBy, metadata.lockedAt);
          } else {
            self.hideLockIndicator();
          }

          // Show/hide action field based on type (heuristic: video files have action)
          const isVideo = /\.(mov|mp4|mxf|avi)$/i.test(clip.mediaPath);
          self.elements.actionGroup.style.display = isVideo ? 'block' : 'none';

          // Update generated name preview
          self.updateGeneratedName();

          // Enable apply button
          self.elements.applyBtn.disabled = false;

          addDebug('[MetadataForm] ✓ Clip loaded into form');

        } catch (e) {
          addDebug('[MetadataForm] ✗ JSON parse error: ' + e.message, true);
          addDebug('[MetadataForm] → Received string: "' + jsonString.substring(0, 100) + '"', true);
          addDebug('[MetadataForm] → String length: ' + jsonString.length + ' chars', true);
          addDebug('[MetadataForm] → First 50 chars: "' + jsonString.substring(0, 50) + '"', true);
          if (jsonString.indexOf('Error') >= 0 || jsonString.indexOf('ERROR') >= 0) {
            addDebug('[MetadataForm] ⚠ Response contains error string (ExtendScript may have thrown exception)', true);
          }
          self.showError('Failed to parse metadata: ' + e.message);
          console.error('JSON parse error:', e, 'Received:', jsonString);
        }
      });
    },

    computeShotNameLocally: function(metadata) {
      // Client-side computation matching ExtendScript logic
      const parts = [];
      if (metadata.location) {parts.push(metadata.location);}
      if (metadata.subject) {parts.push(metadata.subject);}
      if (metadata.action) {parts.push(metadata.action);}
      if (metadata.shotType) {parts.push(metadata.shotType);}

      const baseName = parts.join('-');
      if (metadata.shotNumber) {
        return baseName + '-#' + metadata.shotNumber;
      }
      return baseName;
    },

    clearFormFields: function() {
      this.elements.location.value = '';
      this.elements.subject.value = '';
      this.elements.action.value = '';
      this.elements.shotType.value = '';
      this.elements.description.value = '';
      this.elements.identifier.value = '';
      this.elements.good.checked = false;

      const shotNameElement = document.getElementById('shotNameDisplay');
      if (shotNameElement) {
        shotNameElement.value = '';
      }

      this.updateGeneratedName();
      this.elements.applyBtn.disabled = true;
      addDebug('[MetadataForm] → Form fields cleared');
    },

    showError: function(message) {
      let errorDiv = document.getElementById('errorMessage');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.style.cssText = 'background:#ffebee; color:#c62828; padding:10px; margin:10px 0; border-radius:4px;';
        const formContent = document.querySelector('.form-content');
        if (formContent) {
          formContent.insertBefore(errorDiv, formContent.firstChild);
        }
      }
      errorDiv.textContent = '✗ ' + message;
      errorDiv.style.display = 'block';

      // Auto-hide after 5 seconds
      setTimeout(function() {
        errorDiv.style.display = 'none';
      }, 5000);
    },

    showLockIndicator: function(lockedBy, lockedAt) {
      const indicator = document.getElementById('lockIndicator');
      if (indicator) {
        const lockedBySpan = document.getElementById('lockedBy');
        const lockedAtSpan = document.getElementById('lockedAt');
        if (lockedBySpan) {
          lockedBySpan.textContent = lockedBy || 'unknown';
        }
        if (lockedAtSpan) {
          lockedAtSpan.textContent = lockedAt || 'unknown time';
        }
        indicator.style.display = 'block';
      }
    },

    hideLockIndicator: function() {
      const indicator = document.getElementById('lockIndicator');
      if (indicator) {
        indicator.style.display = 'none';
      }
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

      // Collect form values
      const location = this.elements.location.value.trim();
      const subject = this.elements.subject.value.trim();
      const action = this.elements.action.value.trim();
      const shotType = this.elements.shotType.value;

      // Validate required fields
      if (!location || !subject || !shotType) {
        addDebug('[MetadataForm] ✗ Required fields missing', true);
        this.showError('Location, Subject, and Shot Type are required');
        return;
      }

      // Parse keywords (comma-separated string → array)
      const keywordsInput = this.elements.description.value.trim();
      const keywords = keywordsInput ? keywordsInput.split(',').map(function(k) { return k.trim(); }).filter(function(k) { return k; }) : [];

      // Construct updates object (Schema R1.1 format)
      const updates = {
        location: location,
        subject: subject,
        action: action,
        shotType: shotType,
        keywords: keywords
        // Note: shotName computed server-side by ExtendScript
        // shotNumber not included (managed by IA during initial cataloging)
      };

      addDebug('[MetadataForm] Updates: ' + JSON.stringify(updates));

      // Show loading indicator
      this.showLoadingIndicator('Saving metadata...');

      // Call Track A writeJSONMetadataByNodeId (wrapper accepts nodeId string)
      // SECURITY: Escape nodeId to prevent code injection
      const escapedNodeId = escapeForEvalScript(currentClip.nodeId);
      const updatesJSON = JSON.stringify(updates);
      // Double-escape for ExtendScript string parsing
      const escapedUpdatesJSON = updatesJSON.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const script = 'EAVIngest.writeJSONMetadataByNodeId("' + escapedNodeId + '", "' + escapedUpdatesJSON + '")';

      csInterface.evalScript(script, function(result) {
        self.hideLoadingIndicator();

        addDebug('[MetadataForm] writeJSONMetadata result: ' + result);

        if (result === 'true') {
          // Success
          addDebug('[MetadataForm] ✓ Metadata saved');
          self.showSuccessIndicator('✓ Metadata saved');

          // Reload form to show updated shotName from server
          self.loadClipIntoForm(currentClip);

          // Emit CEP event to notify Navigation Panel (clip name may have changed)
          try {
            const metadataEvent = new CSEvent('com.elevana.metadata-applied', 'APPLICATION');
            metadataEvent.data = JSON.stringify({ nodeId: currentClip.nodeId });
            csInterface.dispatchEvent(metadataEvent);
            addDebug('[MetadataForm] ✓ CEP metadata-applied event dispatched');
          } catch (e) {
            addDebug('[MetadataForm] ✗ Failed to dispatch metadata event: ' + e.message, true);
          }

        } else {
          // Failure
          addDebug('[MetadataForm] ✗ Failed to save metadata', true);
          self.showError('Failed to save metadata. Check ExtendScript console (Premiere Pro → Help → Console)');
          console.error('writeJSONMetadata returned:', result);
        }
      });
    },

    showLoadingIndicator: function(message) {
      let indicator = document.getElementById('loadingIndicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'loadingIndicator';
        indicator.style.cssText = 'background:#e3f2fd; color:#1565c0; padding:10px; margin:10px 0; border-radius:4px;';
        const formContent = document.querySelector('.form-content');
        if (formContent) {
          formContent.insertBefore(indicator, formContent.firstChild);
        }
      }
      indicator.textContent = '⏳ ' + message;
      indicator.style.display = 'block';
    },

    hideLoadingIndicator: function() {
      const indicator = document.getElementById('loadingIndicator');
      if (indicator) {
        indicator.style.display = 'none';
      }
    },

    showSuccessIndicator: function(message) {
      let successDiv = document.getElementById('successMessage');
      if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'successMessage';
        successDiv.style.cssText = 'background:#e8f5e9; color:#2e7d32; padding:10px; margin:10px 0; border-radius:4px;';
        const formContent = document.querySelector('.form-content');
        if (formContent) {
          formContent.insertBefore(successDiv, formContent.firstChild);
        }
      }
      successDiv.textContent = message;
      successDiv.style.display = 'block';

      // Auto-hide after 3 seconds
      setTimeout(function() {
        successDiv.style.display = 'none';
      }, 3000);
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

          // DIAGNOSTIC: Detect EvalScript failure at initialization
          if (typeResult === 'EvalScript error.') {
            addDebug('[Init] ✗ CRITICAL: ExtendScript execution completely failed', true);
            addDebug('[Init] → jsx/host.jsx may have syntax errors or missing dependencies', true);
            addDebug('[Init] → Panel will NOT function - user must fix ExtendScript errors', true);
            return;  // Abort initialization
          }

          if (typeResult === 'object') {
            addDebug('[Init] ✓ ExtendScript loaded successfully - EAVIngest namespace exists');

            // DIAGNOSTIC: Verify Track A functions are available
            csInterface.evalScript('typeof EAVIngest.readJSONMetadataByNodeId', function(funcType) {
              addDebug('[Init] typeof EAVIngest.readJSONMetadataByNodeId: ' + funcType);

              if (funcType === 'function') {
                addDebug('[Init] ✓ Track A integration loaded - JSON metadata features available');
              } else if (funcType === 'EvalScript error.') {
                addDebug('[Init] ✗ CRITICAL: Cannot check Track A functions (EvalScript failure)', true);
              } else {
                addDebug('[Init] ⚠ WARNING: Track A functions missing', true);
                addDebug('[Init] → jsx/generated/track-a-integration.jsx not loaded', true);
                addDebug('[Init] → JSON metadata features will NOT work', true);
                addDebug('[Init] → Run: ./deploy-metadata.sh to ensure all files deployed', true);
              }
            });

            MetadataForm.init();
            addDebug('✓ MetadataForm initialized');
            addDebug('=== Metadata Panel Ready ===');
            addDebug('Waiting for clip selection from Navigation Panel...');
          } else if (typeResult === 'undefined') {
            addDebug('[Init] ✗ ExtendScript load failed - EAVIngest namespace not created', true);
            addDebug('[Init] → jsx/host.jsx did not execute successfully', true);
            addDebug('[Init] → Check ExtendScript Console (Premiere Pro → Help → Console) for errors', true);
          } else {
            addDebug('[Init] ✗ Unexpected typeof result: ' + typeResult, true);
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
