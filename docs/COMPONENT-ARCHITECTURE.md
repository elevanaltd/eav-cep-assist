# Component Architecture - Self-Contained CEP Panel

**Document Version:** 1.0
**Date:** 2025-11-10
**Related:** ADR-002

---

## Architecture Overview

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EAV Ingest Assistant Panel (CEP Extension)                                 │
│  Min Width: 1200px | Min Height: 600px | Resizable                          │
├────────────────┬──────────────────────────────┬──────────────────────────────┤
│                │                              │                              │
│ ClipBrowser    │   VideoPlayer                │   MetadataForm               │
│ 300px (25%)    │   500px (42%)                │   400px (33%)                │
│                │                              │                              │
│ ┌────────────┐ │ ┌──────────────────────────┐ │ ┌──────────────────────┐   │
│ │ Search 🔍  │ │ │                          │ │ │ Clip: clip-name.mov  │   │
│ └────────────┘ │ │                          │ │ └──────────────────────┘   │
│                │ │    <video element>       │ │                              │
│ ┌────────────┐ │ │                          │ │ ┌──────────────────────┐   │
│ │ Filters    │ │ │                          │ │ │ Form Fields:         │   │
│ │ □ Video    │ │ │                          │ │ │  • ID (readonly)     │   │
│ │ □ Image    │ │ │                          │ │ │  • Location          │   │
│ │ □ Has Meta │ │ │                          │ │ │  • Subject           │   │
│ └────────────┘ │ └──────────────────────────┘ │ │  • Action            │   │
│                │                              │ │  • Shot Type         │   │
│ ┌────────────┐ │ ┌──────────────────────────┐ │ │  • Metadata Tags     │   │
│ │ Clip List  │ │ │ [⏮] [▶️] [⏸] [⏭]  [🔊] │ │ └──────────────────────┘   │
│ │            │ │ │ 00:00 ═══╸──── 00:15    │ │                              │
│ │ • clip1    │ │ │ Proxy: [ON] [OFF]        │ │ ┌──────────────────────┐   │
│ │ ✓ clip2    │ │ └──────────────────────────┘ │ │ Generated Name:      │   │
│ │ • clip3    │ │                              │ │ kitchen-oven-CU      │   │
│ │ • clip4    │ │ Status: Proxy loaded         │ │ └──────────────────────┘   │
│ │ • clip5    │ │ Resolution: 1920x1080        │ │                              │
│ │ ...        │ │ Codec: ProRes 422            │ │ [Apply to Premiere]        │
│ │            │ │                              │ │ [🤖 AI Assist]             │
│ │ (scroll)   │ │                              │ │                              │
│ └────────────┘ │                              │ │ [◀ Previous] [Next ▶]      │
│                │                              │ │                              │
│ 523 clips      │                              │ Status: Ready                │
└────────────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## Component 1: ClipBrowser

### Purpose
Browse and select clips from the entire Premiere Pro project without relying on Project Panel selection.

### Responsibilities
- Fetch all project clips via ExtendScript
- Display searchable/filterable list
- Handle user selection → update global state
- Indicate current clip with visual marker
- Show metadata status (✓ = has metadata, • = no metadata)

### Data Flow

```
User clicks clip in list
    ↓
ClipBrowser.selectClip(clipId)
    ↓
Update PanelState.currentClip
Update PanelState.currentClipIndex
    ↓
Emit 'clip-selected' event
    ↓
VideoPlayer listens → loads new video
MetadataForm listens → loads clip metadata
```

### HTML Structure

```html
<div id="clipBrowser" class="clip-browser">
  <!-- Search Bar -->
  <div class="search-bar">
    <input type="text" id="clipSearch" placeholder="Search clips..." />
    <button id="clearSearch">✕</button>
  </div>

  <!-- Filters -->
  <div class="filters">
    <label><input type="checkbox" id="filterVideo" checked> Video</label>
    <label><input type="checkbox" id="filterImage" checked> Image</label>
    <label><input type="checkbox" id="filterHasMeta"> Has Metadata</label>
  </div>

  <!-- Clip List -->
  <div class="clip-list" id="clipList">
    <!-- Dynamically generated clip items -->
    <div class="clip-item" data-clip-id="xyz123">
      <span class="status-icon">✓</span>
      <span class="clip-name">kitchen-oven-cleaning-CU.mov</span>
      <span class="clip-duration">00:15</span>
    </div>
    <!-- ... more clips ... -->
  </div>

  <!-- Footer -->
  <div class="clip-browser-footer">
    <span id="clipCount">0 clips</span>
  </div>
</div>
```

### JavaScript API

```javascript
var ClipBrowser = {
  // Initialize component
  init: function() {
    this.loadAllClips();
    this.setupEventListeners();
  },

  // Load all clips from PP project
  loadAllClips: function() {
    showLoading(true);
    csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
      var data = JSON.parse(result);
      PanelState.allClips = data.clips;
      ClipBrowser.render();
      showLoading(false);
    });
  },

  // Render clip list (with search/filter applied)
  render: function() {
    var filteredClips = this.getFilteredClips();
    var html = filteredClips.map(function(clip) {
      var statusIcon = clip.hasMetadata ? '✓' : '•';
      var selected = clip.nodeId === PanelState.currentClip?.nodeId;
      return '<div class="clip-item' + (selected ? ' selected' : '') + '" ' +
             'data-clip-id="' + clip.nodeId + '">' +
             '<span class="status-icon">' + statusIcon + '</span>' +
             '<span class="clip-name">' + clip.name + '</span>' +
             '<span class="clip-duration">' + formatDuration(clip.duration) + '</span>' +
             '</div>';
    }).join('');

    document.getElementById('clipList').innerHTML = html;
    document.getElementById('clipCount').textContent = filteredClips.length + ' clips';
  },

  // Get clips matching search and filters
  getFilteredClips: function() {
    var search = PanelState.searchFilter.toLowerCase();
    return PanelState.allClips.filter(function(clip) {
      // Search filter
      if (search && clip.name.toLowerCase().indexOf(search) === -1) {
        return false;
      }

      // Type filters
      var filterVideo = document.getElementById('filterVideo').checked;
      var filterImage = document.getElementById('filterImage').checked;
      if (!filterVideo && clip.type === 'video') return false;
      if (!filterImage && clip.type === 'image') return false;

      // Metadata filter
      var filterHasMeta = document.getElementById('filterHasMeta').checked;
      if (filterHasMeta && !clip.hasMetadata) return false;

      return true;
    });
  },

  // Handle clip selection
  selectClip: function(nodeId) {
    var clip = PanelState.allClips.find(function(c) { return c.nodeId === nodeId; });
    if (!clip) return;

    var index = PanelState.allClips.indexOf(clip);
    PanelState.currentClip = clip;
    PanelState.currentClipIndex = index;

    // Emit event
    document.dispatchEvent(new CustomEvent('clip-selected', { detail: clip }));

    // Re-render to update selection
    this.render();
  },

  // Setup event listeners
  setupEventListeners: function() {
    // Search input
    document.getElementById('clipSearch').addEventListener('input', function(e) {
      PanelState.searchFilter = e.target.value;
      ClipBrowser.render();
    });

    // Clip selection
    document.getElementById('clipList').addEventListener('click', function(e) {
      var clipItem = e.target.closest('.clip-item');
      if (clipItem) {
        var nodeId = clipItem.getAttribute('data-clip-id');
        ClipBrowser.selectClip(nodeId);
      }
    });

    // Filter checkboxes
    ['filterVideo', 'filterImage', 'filterHasMeta'].forEach(function(id) {
      document.getElementById(id).addEventListener('change', function() {
        ClipBrowser.render();
      });
    });
  }
};
```

---

## Component 2: VideoPlayer

### Purpose
Display video/image preview with playback controls and proxy/raw toggle.

### Responsibilities
- Load media file via file:// URL
- Display HTML5 video player with controls
- Implement proxy-first loading strategy
- Provide proxy/raw toggle button
- Show playback status (codec, resolution, frame rate)
- Fallback to thumbnail if playback fails

### Data Flow

```
Listen for 'clip-selected' event
    ↓
Determine file path (proxy or original)
    ↓
PanelState.proxyMode ? getProxyPath() : getOriginalPath()
    ↓
Format as file:// URL
    ↓
Set videoElement.src = fileUrl
    ↓
Monitor load events (onloadedmetadata, onerror)
    ↓
Display status + codec info
```

### HTML Structure

```html
<div id="videoPlayer" class="video-player">
  <!-- Video Display Area -->
  <div class="video-container">
    <video id="videoElement" class="video-element" controls>
      Your browser does not support video playback.
    </video>

    <!-- Fallback for unsupported codecs -->
    <div id="videoFallback" class="video-fallback" style="display: none;">
      <p>⚠️ Video codec not supported in browser</p>
      <button id="openSourceMonitorBtn">Open in PP Source Monitor</button>
    </div>
  </div>

  <!-- Custom Controls Bar -->
  <div class="video-controls">
    <!-- Playback -->
    <button id="playPauseBtn">▶️</button>
    <button id="stopBtn">⏹</button>
    <input type="range" id="seekBar" min="0" max="100" value="0" />
    <span id="timeDisplay">00:00 / 00:00</span>

    <!-- Volume -->
    <button id="muteBtn">🔊</button>
    <input type="range" id="volumeBar" min="0" max="100" value="100" />

    <!-- Proxy Toggle -->
    <div class="proxy-toggle">
      <label>Proxy:</label>
      <button id="proxyOnBtn" class="active">ON</button>
      <button id="proxyOffBtn">OFF</button>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="video-status">
    <span id="videoStatus">Ready</span>
    <span id="videoInfo"></span>
  </div>
</div>
```

### JavaScript API

```javascript
var VideoPlayer = {
  videoElement: null,

  // Initialize component
  init: function() {
    this.videoElement = document.getElementById('videoElement');
    this.setupEventListeners();
    this.setupVideoEventListeners();
  },

  // Load clip into video player
  loadClip: function(clip) {
    if (!clip) {
      this.clear();
      return;
    }

    PanelState.isLoading = true;
    this.showStatus('Loading...', 'info');

    // Get file path based on proxy mode
    var filePath = PanelState.proxyMode ? this.getProxyPath(clip) : clip.mediaPath;

    // Convert to file:// URL
    var fileUrl = this.formatFileUrl(filePath);

    console.log('[VideoPlayer] Loading:', fileUrl);

    // Set video source
    this.videoElement.src = fileUrl;
    this.videoElement.load();
  },

  // Get proxy path (try PP API first, fallback to heuristics)
  getProxyPath: function(clip) {
    // Strategy 1: Check if clip has proxy metadata from PP
    if (clip.proxyPath && clip.proxyPath !== '') {
      return clip.proxyPath;
    }

    // Strategy 2: File system heuristics
    // Check for common proxy naming conventions:
    // - original.mov → original_Proxy.mov
    // - original.mov → Proxies/original.mov
    var originalPath = clip.mediaPath;
    var proxyPath = originalPath.replace(/\.([^.]+)$/, '_Proxy.$1');

    // TODO: Validate proxy file exists via ExtendScript
    return proxyPath;
  },

  // Format file path as file:// URL
  formatFileUrl: function(filePath) {
    // Cross-platform path normalization
    var normalized = filePath;

    // Windows: Convert backslashes to forward slashes
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

  // Toggle proxy mode
  toggleProxy: function(useProxy) {
    PanelState.proxyMode = useProxy;

    // Update button states
    document.getElementById('proxyOnBtn').classList.toggle('active', useProxy);
    document.getElementById('proxyOffBtn').classList.toggle('active', !useProxy);

    // Reload current clip with new mode
    if (PanelState.currentClip) {
      this.loadClip(PanelState.currentClip);
    }
  },

  // Clear video player
  clear: function() {
    this.videoElement.src = '';
    this.videoElement.load();
    this.showStatus('No clip selected', 'info');
    document.getElementById('videoInfo').textContent = '';
  },

  // Show status message
  showStatus: function(message, type) {
    var statusEl = document.getElementById('videoStatus');
    statusEl.textContent = message;
    statusEl.className = 'video-status-' + type;
  },

  // Setup event listeners
  setupEventListeners: function() {
    var self = this;

    // Listen for clip selection
    document.addEventListener('clip-selected', function(e) {
      self.loadClip(e.detail);
    });

    // Proxy toggle buttons
    document.getElementById('proxyOnBtn').addEventListener('click', function() {
      self.toggleProxy(true);
    });

    document.getElementById('proxyOffBtn').addEventListener('click', function() {
      self.toggleProxy(false);
    });

    // Open in Source Monitor fallback
    document.getElementById('openSourceMonitorBtn').addEventListener('click', function() {
      if (PanelState.currentClip) {
        csInterface.evalScript('EAVIngest.openInSourceMonitor("' + PanelState.currentClip.nodeId + '")');
      }
    });
  },

  // Setup video element event listeners
  setupVideoEventListeners: function() {
    var self = this;

    this.videoElement.addEventListener('loadedmetadata', function() {
      PanelState.isLoading = false;
      var mode = PanelState.proxyMode ? 'Proxy' : 'Original';
      self.showStatus(mode + ' loaded', 'success');

      // Display video info
      var info = this.videoWidth + 'x' + this.videoHeight + ' | ' +
                 formatDuration(this.duration);
      document.getElementById('videoInfo').textContent = info;
    });

    this.videoElement.addEventListener('error', function(e) {
      PanelState.isLoading = false;
      console.error('[VideoPlayer] Error:', e);

      // Show fallback
      self.showStatus('Playback failed', 'error');
      document.getElementById('videoFallback').style.display = 'block';
      self.videoElement.style.display = 'none';
    });

    this.videoElement.addEventListener('canplay', function() {
      console.log('[VideoPlayer] Can play');
    });
  }
};
```

---

## Component 3: MetadataForm (Refactored)

### Purpose
Edit and apply metadata to selected clip. Largely unchanged from existing implementation, but now listens to clip browser instead of PP selection.

### Responsibilities
- Load clip metadata when clip selected
- Display form fields (ID, Location, Subject, Action, Shot Type, Tags)
- Generate structured naming preview
- Apply metadata to PP project
- Navigate Previous/Next through clip list

### Changes from Current Implementation

| Current (Selection-Based) | New (Self-Contained) |
|---------------------------|----------------------|
| Polls PP selection every 2s | Listens to 'clip-selected' event |
| Refresh button | No refresh needed |
| Previous/Next via PP API | Previous/Next via ClipBrowser |
| Selection detection | Direct state access |

### Data Flow

```
Listen for 'clip-selected' event
    ↓
Load clip metadata into form
    ↓
User edits form fields
    ↓
input events → updateGeneratedName()
    ↓
User clicks "Apply to Premiere"
    ↓
applyMetadata() → evalScript
    ↓
Show success message
    ↓
Optionally auto-advance to next clip
```

### JavaScript API (Changes Only)

```javascript
var MetadataForm = {
  // Initialize component
  init: function() {
    this.setupEventListeners();
    // No more polling! Event-driven instead
  },

  // Setup event listeners
  setupEventListeners: function() {
    var self = this;

    // Listen for clip selection (NEW)
    document.addEventListener('clip-selected', function(e) {
      self.loadClipIntoForm(e.detail);
    });

    // Form field changes
    elements.location.addEventListener('input', updateGeneratedName);
    elements.subject.addEventListener('input', updateGeneratedName);
    elements.action.addEventListener('input', updateGeneratedName);
    elements.shotType.addEventListener('change', updateGeneratedName);

    // Navigation buttons (NEW implementation)
    elements.prevBtn.addEventListener('click', function() {
      self.navigateToPrevious();
    });

    elements.nextBtn.addEventListener('click', function() {
      self.navigateToNext();
    });

    // Apply button (unchanged)
    elements.applyBtn.addEventListener('click', applyMetadata);
  },

  // Navigate to previous clip (NEW)
  navigateToPrevious: function() {
    if (PanelState.currentClipIndex > 0) {
      var prevClip = PanelState.allClips[PanelState.currentClipIndex - 1];
      ClipBrowser.selectClip(prevClip.nodeId);
    }
  },

  // Navigate to next clip (NEW)
  navigateToNext: function() {
    if (PanelState.currentClipIndex < PanelState.allClips.length - 1) {
      var nextClip = PanelState.allClips[PanelState.currentClipIndex + 1];
      ClipBrowser.selectClip(nextClip.nodeId);
    }
  },

  // Load clip into form (mostly unchanged)
  loadClipIntoForm: function(clip) {
    // ... existing implementation from main.js ...
    // Update header, parse ID, load fields, etc.
  }
};

// ... rest of existing functions (applyMetadata, updateGeneratedName, etc.) ...
```

---

## State Management

### Global Panel State

```javascript
/**
 * Global state for the entire panel
 * Single source of truth for clip navigation, selection, and display mode
 */
var PanelState = {
  // Clip data
  allClips: [],              // Array of all project clips (loaded on init)
  currentClip: null,         // Currently selected clip object
  currentClipIndex: -1,      // Index of current clip in allClips array

  // Display mode
  proxyMode: true,           // true = show proxy, false = show original

  // Video player state
  videoUrl: '',              // Current file:// URL being displayed
  isLoading: false,          // Video loading state

  // Clip browser state
  searchFilter: '',          // Search text filter

  // Metadata form state (inherited from existing)
  formData: {
    location: '',
    subject: '',
    action: '',
    shotType: '',
    metadata: ''
  }
};
```

### Event System

Components communicate via custom DOM events:

```javascript
// Event: clip-selected
// Fired by: ClipBrowser
// Listened by: VideoPlayer, MetadataForm
document.dispatchEvent(new CustomEvent('clip-selected', {
  detail: {
    nodeId: 'xyz123',
    name: 'kitchen-oven-cleaning-CU.mov',
    mediaPath: '/path/to/file.mov',
    proxyPath: '/path/to/file_Proxy.mov',
    // ... other clip properties
  }
}));

// Event: metadata-applied
// Fired by: MetadataForm
// Listened by: ClipBrowser (to update status icons)
document.dispatchEvent(new CustomEvent('metadata-applied', {
  detail: {
    nodeId: 'xyz123',
    success: true
  }
}));

// Event: proxy-toggled
// Fired by: VideoPlayer
// Listened by: (future components if needed)
document.dispatchEvent(new CustomEvent('proxy-toggled', {
  detail: {
    proxyMode: true
  }
}));
```

---

## Layout & Responsive Design

### CSS Grid Layout

```css
.panel-container {
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  grid-template-rows: 1fr;
  height: 100vh;
  gap: 0;
  overflow: hidden;
}

.clip-browser {
  grid-column: 1;
  background-color: #2b2b2b;
  border-right: 1px solid #404040;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-player {
  grid-column: 2;
  background-color: #1e1e1e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.metadata-form {
  grid-column: 3;
  background-color: #2b2b2b;
  border-left: 1px solid #404040;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
```

### Responsive Breakpoints

| Panel Width | Layout Adjustment |
|-------------|-------------------|
| **1200px+ (default)** | 3-column grid: 300px \| flex \| 400px |
| **900-1199px** | Narrow columns: 250px \| flex \| 350px |
| **600-899px** | Collapse browser: hidden \| flex \| 350px (dropdown nav) |
| **< 600px** | Stack vertically (not recommended) |

---

## Initialization Sequence

```
CEP Panel Loads
    ↓
index.html rendered
    ↓
main.js executes
    ↓
Initialize CSInterface
    ↓
┌──────────────────────────┐
│ PanelInit.init()         │
│  ├─ ClipBrowser.init()   │ ← Load all clips via ExtendScript
│  │   └─ loadAllClips()   │
│  ├─ VideoPlayer.init()   │ ← Setup video element
│  └─ MetadataForm.init()  │ ← Setup form listeners
└──────────────────────────┘
    ↓
ClipBrowser renders clip list
    ↓
User clicks first clip
    ↓
'clip-selected' event fires
    ↓
VideoPlayer loads video
MetadataForm loads metadata
    ↓
Panel ready for user interaction
```

---

## Error Handling Patterns

### Video Playback Errors

```javascript
// Error hierarchy:
// 1. Codec not supported → Show fallback UI
// 2. File not found → Show error message
// 3. Permission denied → Show error message

videoElement.addEventListener('error', function(e) {
  var error = this.error;
  var message = '';

  switch(error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      message = 'Playback aborted';
      break;
    case MediaError.MEDIA_ERR_NETWORK:
      message = 'Network error';
      break;
    case MediaError.MEDIA_ERR_DECODE:
      message = 'Codec not supported - try proxy or open in Source Monitor';
      showFallbackUI();
      break;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      message = 'File format not supported';
      showFallbackUI();
      break;
  }

  VideoPlayer.showStatus(message, 'error');
});
```

### ExtendScript Communication Errors

```javascript
function safeEvalScript(script, callback) {
  csInterface.evalScript(script, function(result) {
    try {
      var data = JSON.parse(result);

      if (data.error) {
        console.error('[ExtendScript] Error:', data.error);
        showStatus('PP Error: ' + data.error, 'error');
        return;
      }

      callback(data);
    } catch (e) {
      console.error('[ExtendScript] Parse error:', e);
      showStatus('Communication error with Premiere Pro', 'error');
    }
  });
}
```

---

## Performance Optimization

### Clip List Rendering

```javascript
// For large projects (1000+ clips), use virtual scrolling
var VirtualScroll = {
  viewportHeight: 600,      // Visible area height
  itemHeight: 32,           // Height of each clip item
  buffer: 10,               // Extra items to render above/below

  render: function(scrollTop) {
    var startIndex = Math.floor(scrollTop / this.itemHeight) - this.buffer;
    var endIndex = startIndex + Math.ceil(this.viewportHeight / this.itemHeight) + this.buffer * 2;

    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(PanelState.allClips.length, endIndex);

    // Only render visible clips
    var visibleClips = PanelState.allClips.slice(startIndex, endIndex);
    // ... render visibleClips ...
  }
};
```

### Video Preloading

```javascript
// Preload next clip's video while user edits metadata
var Preloader = {
  preloadNext: function() {
    if (PanelState.currentClipIndex < PanelState.allClips.length - 1) {
      var nextClip = PanelState.allClips[PanelState.currentClipIndex + 1];
      var preloadUrl = VideoPlayer.formatFileUrl(
        PanelState.proxyMode ? VideoPlayer.getProxyPath(nextClip) : nextClip.mediaPath
      );

      // Create hidden video element for preloading
      var preloadVideo = document.createElement('video');
      preloadVideo.src = preloadUrl;
      preloadVideo.preload = 'auto';
      preloadVideo.style.display = 'none';
      document.body.appendChild(preloadVideo);
    }
  }
};
```

---

## Component Dependencies

```
PanelState (Global State)
    ↓
    ├─→ ClipBrowser
    │     ├─ Reads: allClips, currentClipIndex, searchFilter
    │     └─ Writes: currentClip, currentClipIndex
    │
    ├─→ VideoPlayer
    │     ├─ Reads: currentClip, proxyMode
    │     └─ Writes: isLoading, videoUrl
    │
    └─→ MetadataForm
          ├─ Reads: currentClip, currentClipIndex, allClips
          └─ Writes: formData

Events (Cross-Component Communication)
    ├─→ clip-selected: ClipBrowser → VideoPlayer, MetadataForm
    ├─→ metadata-applied: MetadataForm → ClipBrowser
    └─→ proxy-toggled: VideoPlayer → (future components)
```

---

## Next Steps

1. **ExtendScript API Extensions** - See `EXTENDSCRIPT-API-SPEC.md`
2. **Implementation Roadmap** - See `IMPLEMENTATION-ROADMAP.md`
3. **Proxy Detection Strategy** - Research PP API capabilities
4. **Prototype Development** - Validate technical assumptions

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
