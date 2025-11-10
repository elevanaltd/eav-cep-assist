/**
 * EAV Ingest Assistant - Navigation Panel
 * Clip browser with search and filtering
 */

(function() {
    'use strict';

    console.log('[Navigation] Initializing...');

    // ========================================
    // STATE
    // ========================================

    var state = {
        allClips: [],
        filteredClips: [],
        selectedClip: null,
        searchTerm: '',
        filterVideo: true,
        filterImage: true,
        filterHasMeta: false
    };

    // ========================================
    // INITIALIZE
    // ========================================

    var csInterface;
    try {
        csInterface = new CSInterface();
        console.log('[Navigation] CSInterface initialized');
    } catch (e) {
        console.error('[Navigation] Failed to initialize CSInterface:', e);
        alert('Error: CSInterface not available');
        return;
    }

    // DOM elements
    var clipSearch = document.getElementById('clipSearch');
    var clearSearch = document.getElementById('clearSearch');
    var filterVideo = document.getElementById('filterVideo');
    var filterImage = document.getElementById('filterImage');
    var filterHasMeta = document.getElementById('filterHasMeta');
    var clipList = document.getElementById('clipList');
    var clipCount = document.getElementById('clipCount');
    var refreshClips = document.getElementById('refreshClips');

    // ========================================
    // EXTENDSCRIPT LOADING
    // ========================================

    function loadExtendScript() {
        console.log('[Navigation] Loading ExtendScript...');

        var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        var jsxPath = extensionPath + '/jsx/host.jsx';

        csInterface.evalScript('$.evalFile("' + jsxPath + '")', function(result) {
            csInterface.evalScript('typeof EAVIngest', function(typeResult) {
                if (typeResult === 'object') {
                    console.log('[Navigation] ✓ ExtendScript loaded');
                    loadAllClips();
                } else {
                    console.error('[Navigation] ✗ ExtendScript failed to load');
                }
            });
        });
    }

    // ========================================
    // CLIP LOADING
    // ========================================

    function loadAllClips() {
        console.log('[Navigation] Loading clips from project...');

        clipList.innerHTML = '<div class="clip-list-empty"><p>Loading...</p></div>';

        csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
            try {
                var data = JSON.parse(result);

                if (data.error) {
                    console.error('[Navigation] Error loading clips:', data.error);
                    clipList.innerHTML = '<div class="clip-list-empty"><p>No project open</p><p class="hint">' + data.error + '</p></div>';
                    return;
                }

                state.allClips = data.clips || [];
                console.log('[Navigation] Loaded', state.allClips.length, 'clips');

                filterAndRender();
            } catch (e) {
                console.error('[Navigation] Parse error:', e);
                clipList.innerHTML = '<div class="clip-list-empty"><p>Error loading clips</p></div>';
            }
        });
    }

    // ========================================
    // FILTERING & RENDERING
    // ========================================

    function filterAndRender() {
        // Apply filters
        state.filteredClips = state.allClips.filter(function(clip) {
            // Search filter
            if (state.searchTerm) {
                var searchLower = state.searchTerm.toLowerCase();
                if (clip.name.toLowerCase().indexOf(searchLower) === -1) {
                    return false;
                }
            }

            // Type filters
            // Note: We can't reliably determine video vs image from API,
            // so for now just show all clips

            // Metadata filter
            if (state.filterHasMeta) {
                if (!clip.tapeName && !clip.description && !clip.shot) {
                    return false;
                }
            }

            return true;
        });

        render();
    }

    function render() {
        clipCount.textContent = state.filteredClips.length + ' clip' + (state.filteredClips.length !== 1 ? 's' : '');

        if (state.filteredClips.length === 0) {
            clipList.innerHTML = '<div class="clip-list-empty"><p>No clips found</p><p class="hint">Adjust filters or search</p></div>';
            return;
        }

        // Build clip list
        var html = '';
        state.filteredClips.forEach(function(clip) {
            var hasMetadata = !!(clip.tapeName || clip.description || clip.shot);
            var isSelected = state.selectedClip && state.selectedClip.nodeId === clip.nodeId;

            html += '<div class="clip-item' + (isSelected ? ' selected' : '') + '" data-nodeid="' + clip.nodeId + '">';
            html += '<span class="status-icon ' + (hasMetadata ? 'tagged' : 'untagged') + '">' + (hasMetadata ? '✓' : '○') + '</span>';
            html += '<span class="clip-name">' + escapeHtml(clip.name) + '</span>';
            html += '</div>';
        });

        clipList.innerHTML = html;

        // Add click handlers
        var clipItems = clipList.querySelectorAll('.clip-item');
        clipItems.forEach(function(item) {
            item.addEventListener('click', function() {
                var nodeId = this.getAttribute('data-nodeid');
                selectClip(nodeId);
            });
        });
    }

    // ========================================
    // CLIP SELECTION
    // ========================================

    function selectClip(nodeId) {
        // Find clip
        var clip = state.allClips.find(function(c) { return c.nodeId === nodeId; });
        if (!clip) return;

        console.log('[Navigation] Clip selected:', clip.name);
        state.selectedClip = clip;
        render();

        // Open in Source Monitor
        csInterface.evalScript('EAVIngest.openInSourceMonitor("' + nodeId + '")', function(result) {
            try {
                var data = JSON.parse(result);
                if (data.success) {
                    console.log('[Navigation] ✓ Opened in Source Monitor');
                } else {
                    console.error('[Navigation] Failed to open in Source Monitor:', data.error);
                }
            } catch (e) {
                console.error('[Navigation] Parse error:', e);
            }
        });

        // Dispatch event to Metadata panel
        var event = new CSEvent('com.elevana.eav.clipSelected', 'APPLICATION');
        event.data = JSON.stringify(clip);
        csInterface.dispatchEvent(event);

        console.log('[Navigation] Dispatched clipSelected event');
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    clipSearch.addEventListener('input', function(e) {
        state.searchTerm = e.target.value;
        filterAndRender();
    });

    clearSearch.addEventListener('click', function() {
        clipSearch.value = '';
        state.searchTerm = '';
        filterAndRender();
    });

    filterVideo.addEventListener('change', function(e) {
        state.filterVideo = e.target.checked;
        filterAndRender();
    });

    filterImage.addEventListener('change', function(e) {
        state.filterImage = e.target.checked;
        filterAndRender();
    });

    filterHasMeta.addEventListener('change', function(e) {
        state.filterHasMeta = e.target.checked;
        filterAndRender();
    });

    refreshClips.addEventListener('click', function() {
        console.log('[Navigation] Refreshing clips...');
        loadAllClips();
    });

    // Listen for refresh requests from Metadata panel
    csInterface.addEventListener('com.elevana.eav.refreshClips', function(event) {
        console.log('[Navigation] Received refresh request from Metadata panel');
        loadAllClips();
    });

    // ========================================
    // UTILITY
    // ========================================

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // INITIALIZE
    // ========================================

    loadExtendScript();

})();
