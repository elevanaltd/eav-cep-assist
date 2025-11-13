/**

 * EAV Ingest Assistant - CEP Panel Logic

 * Handles UI interactions and communication with Premiere Pro via ExtendScript

 */



(function() {

  'use strict';



  // Initialize CSInterface

  const csInterface = new CSInterface();



  // Current state

  let currentClip = null;

  let allProjectClips = [];

  let currentClipIndex = -1;



  // UI Elements

  const elements = {

    clipName: document.getElementById('clipName'),

    clipPath: document.getElementById('clipPath'),



    // Form fields

    id: document.getElementById('id'),

    location: document.getElementById('location'),

    subject: document.getElementById('subject'),

    action: document.getElementById('action'),

    shotType: document.getElementById('shotType'),

    metadata: document.getElementById('metadata'),

    actionGroup: document.getElementById('actionGroup'),



    // Generated name preview

    generatedName: document.getElementById('generatedName'),



    // Buttons

    refreshBtn: document.getElementById('refreshBtn'),

    prevBtn: document.getElementById('prevBtn'),

    nextBtn: document.getElementById('nextBtn'),

    openSourceBtn: document.getElementById('openSourceBtn'),

    applyBtn: document.getElementById('applyBtn'),



    // Status

    statusMsg: document.getElementById('statusMsg')

  };



  /**

     * Initialize the panel

     */

  function init() {

    console.log('EAV Ingest Assistant initializing...');



    // Set up event listeners

    setupEventListeners();



    // Load initial selection

    loadSelectedClip();



    console.log('Panel initialized');

  }



  /**

     * Set up all event listeners

     */

  function setupEventListeners() {

    // Refresh button

    elements.refreshBtn.addEventListener('click', function() {

      loadSelectedClip();

    });



    // Form field changes - update preview

    elements.location.addEventListener('input', updateGeneratedName);

    elements.subject.addEventListener('input', updateGeneratedName);

    elements.action.addEventListener('input', updateGeneratedName);

    elements.shotType.addEventListener('change', updateGeneratedName);



    // Navigation buttons

    elements.prevBtn.addEventListener('click', navigateToPrevious);

    elements.nextBtn.addEventListener('click', navigateToNext);



    // Open in Source Monitor

    elements.openSourceBtn.addEventListener('click', openInSourceMonitor);



    // Apply button

    elements.applyBtn.addEventListener('click', applyMetadata);



    // Listen for Premiere Pro selection changes

    // Note: CEP doesn't have a direct selection change event,

    // but we can set up a periodic check or manual refresh

    setInterval(checkSelectionChange, 2000);

  }



  /**

     * Load currently selected clip from Premiere Pro

     */

  function loadSelectedClip() {

    showStatus('Loading selection...', 'info');



    csInterface.evalScript('EAVIngest.getSelectedClips()', function(result) {

      try {

        const data = JSON.parse(result);



        if (data.error) {

          showStatus(data.error, 'error');

          clearForm();

          return;

        }



        if (data.clips && data.clips.length > 0) {

          // Load the first selected clip

          currentClip = data.clips[0];

          loadClipIntoForm(currentClip);

          loadAllProjectClips();

          showStatus('Clip loaded: ' + currentClip.name, 'success');

        } else {

          showStatus('No clips selected', 'error');

          clearForm();

        }

      } catch (e) {

        console.error('Error parsing result:', e);

        showStatus('Error loading clip', 'error');

      }

    });

  }



  /**

     * Load clip data into form

     */

  function loadClipIntoForm(clip) {

    // Update header

    elements.clipName.textContent = clip.name;

    elements.clipPath.textContent = clip.treePath || '';



    // Parse ID from filename

    const parsedId = parseIdFromFilename(clip.name);

    elements.id.value = parsedId;



    // Load existing metadata from PP fields

    // Parse structured components from current name or tape name

    const components = parseStructuredComponents(clip.name);



    elements.location.value = components.location || '';

    elements.subject.value = components.subject || '';

    elements.action.value = components.action || '';

    elements.shotType.value = components.shotType || '';



    // Load Description field as metadata tags

    if (clip.description) {

      elements.metadata.value = clip.description;

    } else {

      elements.metadata.value = '';

    }



    // Show/hide action field based on type

    const isVideo = clip.mediaPath &&

                     (clip.mediaPath.toLowerCase().endsWith('.mp4') ||

                      clip.mediaPath.toLowerCase().endsWith('.mov') ||

                      clip.mediaPath.toLowerCase().endsWith('.mxf'));



    elements.actionGroup.style.display = isVideo ? 'flex' : 'none';



    // Update generated name preview

    updateGeneratedName();



    // Enable buttons

    elements.openSourceBtn.disabled = false;

    elements.applyBtn.disabled = false;

  }



  /**

     * Parse 8-digit ID from filename

     */

  function parseIdFromFilename(filename) {

    const match = filename.match(/^(\d{8})/);

    return match ? match[1] : '';

  }



  /**

     * Parse structured components from name

     * Expected format: {id}-{location}-{subject}-{action}-{shotType}

     * or for images: {id}-{location}-{subject}-{shotType}

     */

  function parseStructuredComponents(name) {

    // Remove extension

    const nameWithoutExt = name.replace(/\.[^.]+$/, '');



    // Split by hyphen

    const parts = nameWithoutExt.split('-');



    if (parts.length < 2) {

      return {};

    }



    // Skip the ID (first part)

    const components = {};



    if (parts.length >= 4) {

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

  }



  /**

     * Update the generated name preview

     */

  function updateGeneratedName() {

    const id = elements.id.value;

    const location = elements.location.value.trim();

    const subject = elements.subject.value.trim();

    const action = elements.action.value.trim();

    const shotType = elements.shotType.value;



    const parts = [];



    if (id) {parts.push(id);}

    if (location) {parts.push(location);}

    if (subject) {parts.push(subject);}



    // Include action only if visible (videos)

    if (elements.actionGroup.style.display !== 'none' && action) {

      parts.push(action);

    }



    if (shotType) {parts.push(shotType);}



    const generatedName = parts.length > 0 ? parts.join('-') : '-';

    elements.generatedName.textContent = generatedName;

  }



  /**

     * Clear the form

     */

  function clearForm() {

    currentClip = null;

    elements.clipName.textContent = 'No clip selected';

    elements.clipPath.textContent = '';

    elements.id.value = '';

    elements.location.value = '';

    elements.subject.value = '';

    elements.action.value = '';

    elements.shotType.value = '';

    elements.metadata.value = '';

    elements.generatedName.textContent = '-';

    elements.openSourceBtn.disabled = true;

    elements.applyBtn.disabled = true;

  }



  /**

     * Load all project clips for navigation

     */

  function loadAllProjectClips() {

    csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {

      try {

        const data = JSON.parse(result);

        if (data.clips) {

          allProjectClips = data.clips;



          // Find current clip index

          if (currentClip) {

            currentClipIndex = allProjectClips.findIndex(function(clip) {

              return clip.nodeId === currentClip.nodeId;

            });

          }



          updateNavigationButtons();

        }

      } catch (e) {

        console.error('Error loading project clips:', e);

      }

    });

  }



  /**

     * Update navigation button states

     */

  function updateNavigationButtons() {

    elements.prevBtn.disabled = currentClipIndex <= 0;

    elements.nextBtn.disabled = currentClipIndex >= allProjectClips.length - 1 || allProjectClips.length === 0;

  }



  /**

     * Navigate to previous clip

     */

  function navigateToPrevious() {

    if (currentClipIndex > 0) {

      const prevClip = allProjectClips[currentClipIndex - 1];

      selectAndLoadClip(prevClip.nodeId);

    }

  }



  /**

     * Navigate to next clip

     */

  function navigateToNext() {

    if (currentClipIndex < allProjectClips.length - 1) {

      const nextClip = allProjectClips[currentClipIndex + 1];

      selectAndLoadClip(nextClip.nodeId);

    }

  }



  /**

     * Select and load a specific clip

     */

  function selectAndLoadClip(nodeId) {

    csInterface.evalScript('EAVIngest.selectClip("' + nodeId + '")', function(result) {

      try {

        const data = JSON.parse(result);

        if (data.success) {

          // Wait a bit for PP to update, then load

          setTimeout(loadSelectedClip, 100);

        }

      } catch (e) {

        console.error('Error selecting clip:', e);

      }

    });

  }



  /**

     * Open current clip in Source Monitor

     */

  function openInSourceMonitor() {

    if (!currentClip) {return;}



    csInterface.evalScript('EAVIngest.openInSourceMonitor("' + currentClip.nodeId + '")', function(result) {

      try {

        const data = JSON.parse(result);

        if (data.success) {

          showStatus('Opened in Source Monitor', 'success');

        } else {

          showStatus('Error: ' + (data.error || 'Unknown error'), 'error');

        }

      } catch (e) {

        console.error('Error opening in source monitor:', e);

        showStatus('Error opening clip', 'error');

      }

    });

  }



  /**

     * Apply metadata to Premiere Pro

     */

  function applyMetadata() {

    if (!currentClip) {

      showStatus('No clip selected', 'error');

      return;

    }



    // Build the generated name

    const generatedName = elements.generatedName.textContent;

    if (generatedName === '-') {

      showStatus('Please fill in at least one field', 'error');

      return;

    }



    // Prepare metadata object

    const metadata = {

      name: generatedName,

      tapeName: currentClip.name, // Preserve original filename in Tape Name

      description: elements.metadata.value.trim(),

      shot: elements.shotType.value

    };



    showStatus('Updating Premiere Pro...', 'info');



    // Call ExtendScript to update PP

    const metadataJson = JSON.stringify(metadata).replace(/"/g, '\\"');

    const script = 'EAVIngest.updateClipMetadata("' + currentClip.nodeId + '", JSON.parse("' + metadataJson + '"))';



    csInterface.evalScript(script, function(result) {

      try {

        const data = JSON.parse(result);

        if (data.success) {

          showStatus('✓ Updated: ' + data.updatedName, 'success');



          // Update current clip name

          currentClip.name = data.updatedName;

          elements.clipName.textContent = data.updatedName;

        } else {

          showStatus('Error: ' + (data.error || 'Unknown error'), 'error');

        }

      } catch (e) {

        console.error('Error applying metadata:', e);

        showStatus('Error updating Premiere Pro', 'error');

      }

    });

  }



  /**

     * Check if selection has changed (polling)

     */

  let lastClipNodeId = null;

  function checkSelectionChange() {

    csInterface.evalScript('EAVIngest.getSelectedClips()', function(result) {

      try {

        const data = JSON.parse(result);

        if (data.clips && data.clips.length > 0) {

          const newNodeId = data.clips[0].nodeId;

          if (newNodeId !== lastClipNodeId) {

            lastClipNodeId = newNodeId;

            loadSelectedClip();

          }

        }

      } catch (e) {

        // Ignore errors during polling

      }

    });

  }



  /**

     * Show status message

     */

  function showStatus(message, type) {

    elements.statusMsg.textContent = message;

    elements.statusMsg.className = 'status-msg ' + type;



    // Auto-hide after 3 seconds

    if (type === 'success' || type === 'info') {

      setTimeout(function() {

        elements.statusMsg.style.display = 'none';

      }, 3000);

    }

  }



  // Initialize when DOM is ready

  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', init);

  } else {

    init();

  }



})();
