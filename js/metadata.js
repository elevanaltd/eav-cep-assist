/**
 * EAV Ingest Assistant - Metadata Panel
 * Metadata form for tagging clips
 */

(function() {
    'use strict';

    console.log('[Metadata] Initializing...');

    // ========================================
    // STATE
    // ========================================

    var state = {
        allClips: [],
        currentClip: null,
        currentIndex: -1
    };

    // ========================================
    // INITIALIZE
    // ========================================

    var csInterface;
    try {
        csInterface = new CSInterface();
        console.log('[Metadata] CSInterface initialized');
    } catch (e) {
        console.error('[Metadata] Failed to initialize CSInterface:', e);
        alert('Error: CSInterface not available');
        return;
    }

    // DOM elements
    var formContainer = document.getElementById('formContainer');
    var noSelection = document.getElementById('noSelection');
    var formClipName = document.getElementById('formClipName');
    var idField = document.getElementById('id');
    var locationField = document.getElementById('location');
    var subjectField = document.getElementById('subject');
    var actionField = document.getElementById('action');
    var shotTypeField = document.getElementById('shotType');
    var metadataField = document.getElementById('metadata');
    var generatedName = document.getElementById('generatedName');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var applyBtn = document.getElementById('applyBtn');
    var formStatus = document.getElementById('formStatus');

    // ========================================
    // EXTENDSCRIPT LOADING
    // ========================================

    function loadExtendScript() {
        console.log('[Metadata] Loading ExtendScript...');

        var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        var jsxPath = extensionPath + '/jsx/host.jsx';

        csInterface.evalScript('$.evalFile("' + jsxPath + '")', function(result) {
            csInterface.evalScript('typeof EAVIngest', function(typeResult) {
                if (typeResult === 'object') {
                    console.log('[Metadata] ✓ ExtendScript loaded');
                    loadAllClips();
                } else {
                    console.error('[Metadata] ✗ ExtendScript failed to load');
                }
            });
        });
    }

    // ========================================
    // CLIP LOADING
    // ========================================

    function loadAllClips() {
        console.log('[Metadata] Loading clips for navigation...');

        csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
            try {
                var data = JSON.parse(result);

                if (data.error) {
                    console.error('[Metadata] Error loading clips:', data.error);
                    return;
                }

                state.allClips = data.clips || [];
                console.log('[Metadata] Loaded', state.allClips.length, 'clips for navigation');
                updateNavigationButtons();
            } catch (e) {
                console.error('[Metadata] Parse error:', e);
            }
        });
    }

    // ========================================
    // CLIP SELECTION (from Navigation panel)
    // ========================================

    csInterface.addEventListener('com.elevana.eav.clipSelected', function(event) {
        try {
            var clip = JSON.parse(event.data);
            console.log('[Metadata] Received clip selection:', clip.name);
            loadClip(clip);
        } catch (e) {
            console.error('[Metadata] Failed to parse clip data:', e);
        }
    });

    function loadClip(clip) {
        state.currentClip = clip;

        // Find index in allClips for navigation
        state.currentIndex = state.allClips.findIndex(function(c) {
            return c.nodeId === clip.nodeId;
        });

        // Show form, hide no-selection message
        noSelection.style.display = 'none';
        formContainer.style.display = 'flex';

        // Populate header
        formClipName.textContent = clip.name || 'Unknown clip';

        // Extract ID from filename (8-digit pattern)
        var idMatch = clip.name.match(/\d{8}/);
        idField.value = idMatch ? idMatch[0] : '';

        // Load existing metadata
        locationField.value = '';
        subjectField.value = clip.description || '';
        actionField.value = '';
        shotTypeField.value = clip.shot || '';
        metadataField.value = '';

        // Enable apply button
        applyBtn.disabled = false;

        // Update navigation buttons
        updateNavigationButtons();

        // Update generated name
        updateGeneratedName();

        console.log('[Metadata] Clip loaded');
    }

    // ========================================
    // NAVIGATION
    // ========================================

    function updateNavigationButtons() {
        if (state.currentIndex === -1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        prevBtn.disabled = (state.currentIndex === 0);
        nextBtn.disabled = (state.currentIndex === state.allClips.length - 1);
    }

    prevBtn.addEventListener('click', function() {
        if (state.currentIndex > 0) {
            var prevClip = state.allClips[state.currentIndex - 1];
            selectAndNotify(prevClip);
        }
    });

    nextBtn.addEventListener('click', function() {
        if (state.currentIndex < state.allClips.length - 1) {
            var nextClip = state.allClips[state.currentIndex + 1];
            selectAndNotify(nextClip);
        }
    });

    function selectAndNotify(clip) {
        // Load clip locally
        loadClip(clip);

        // Open in Source Monitor
        csInterface.evalScript('EAVIngest.openInSourceMonitor("' + clip.nodeId + '")', function(result) {
            try {
                var data = JSON.parse(result);
                if (data.success) {
                    console.log('[Metadata] ✓ Opened in Source Monitor');
                } else {
                    console.error('[Metadata] Failed to open:', data.error);
                }
            } catch (e) {
                console.error('[Metadata] Parse error:', e);
            }
        });

        // Notify Navigation panel to update selection highlight
        var event = new CSEvent('com.elevana.eav.clipSelected', 'APPLICATION');
        event.data = JSON.stringify(clip);
        csInterface.dispatchEvent(event);
    }

    // ========================================
    // GENERATED NAME
    // ========================================

    function updateGeneratedName() {
        var parts = [
            idField.value,
            locationField.value,
            subjectField.value,
            actionField.value,
            shotTypeField.value
        ];

        var name = parts.filter(function(p) {
            return p && p.trim();
        }).join('-');

        generatedName.textContent = name || '-';
    }

    // Update on field changes
    [idField, locationField, subjectField, actionField, shotTypeField].forEach(function(field) {
        field.addEventListener('input', updateGeneratedName);
    });

    // ========================================
    // APPLY METADATA
    // ========================================

    applyBtn.addEventListener('click', function() {
        if (!state.currentClip) return;

        var generatedNameValue = generatedName.textContent;
        if (generatedNameValue === '-') {
            showStatus('Please fill in at least one metadata field', 'error');
            return;
        }

        var metadata = {
            name: generatedNameValue,
            tapeName: idField.value,
            description: subjectField.value,
            shot: shotTypeField.value
        };

        console.log('[Metadata] Applying metadata:', metadata);
        showStatus('Applying metadata...', 'info');
        applyBtn.disabled = true;

        var metadataJson = JSON.stringify(metadata);
        var escapedJson = metadataJson.replace(/"/g, '\\"');

        csInterface.evalScript('EAVIngest.updateClipMetadata("' + state.currentClip.nodeId + '", "' + escapedJson + '")', function(result) {
            try {
                var data = JSON.parse(result);
                if (data.success) {
                    showStatus('✓ Metadata applied successfully', 'success');
                    console.log('[Metadata] ✓ Metadata applied');

                    // Request Navigation panel to refresh
                    var event = new CSEvent('com.elevana.eav.refreshClips', 'APPLICATION');
                    csInterface.dispatchEvent(event);

                    // Auto-advance to next clip
                    setTimeout(function() {
                        if (state.currentIndex < state.allClips.length - 1) {
                            nextBtn.click();
                        }
                    }, 500);
                } else {
                    showStatus('Failed: ' + (data.error || 'Unknown error'), 'error');
                    console.error('[Metadata] Failed:', data.error);
                }
            } catch (e) {
                showStatus('Error applying metadata', 'error');
                console.error('[Metadata] Parse error:', e);
            } finally {
                applyBtn.disabled = false;
            }
        });
    });

    // ========================================
    // STATUS MESSAGES
    // ========================================

    function showStatus(message, type) {
        formStatus.textContent = message;
        formStatus.className = 'form-status ' + (type || 'info');

        if (type === 'success' || type === 'error') {
            setTimeout(function() {
                formStatus.textContent = '';
                formStatus.className = 'form-status';
            }, 3000);
        }
    }

    // ========================================
    // INITIALIZE
    // ========================================

    loadExtendScript();

})();
