# CEP Panel Implementation Patterns - EAV Ingest Assistant
## Comprehensive Architectural Analysis

**Repository:** `/home/user/eav-cep-assist`  
**Target Host:** Adobe Premiere Pro (PPRO) 14.0+  
**Technology Stack:** CEP 9.0, ExtendScript, HTML5/CSS3, JavaScript, XML Manifest

---

## 1. CEP PANEL STRUCTURE & FILES

### Directory Layout
```
eav-cep-assist/
├── CSXS/
│   └── manifest.xml           # CEP Extension manifest (core configuration)
├── jsx/
│   └── host.jsx               # ExtendScript bridge (PP communication)
├── js/
│   ├── CSInterface.js         # CEP library (43KB - communication layer)
│   └── main.js                # Panel logic (14KB - UI control)
├── css/
│   └── style.css              # Panel styling (6.5KB - Adobe theme)
├── index.html                 # Panel UI (5.4KB - form layout)
├── .debug                     # Debug configuration (port 8092)
├── package.json               # Metadata (npm-style)
└── README.md                  # Documentation
```

### Key Files Summary

| File | Purpose | Key Patterns |
|------|---------|--------------|
| `CSXS/manifest.xml` | Extension declaration & config | Host compatibility, panel geometry, JSX script path |
| `jsx/host.jsx` | ExtendScript binding | PP API calls, object lookup, metadata I/O |
| `js/main.js` | Panel controller | CSInterface initialization, event listeners, state management |
| `index.html` | UI template | Form groups, button layout, data binding points |
| `css/style.css` | Visual design | Adobe dark theme, responsive form strips, status messaging |

---

## 2. CEP MANIFEST CONFIGURATION (.debug & CSXS/manifest.xml)

### Manifest Structure (manifest.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest Version="7.0" ExtensionBundleId="com.elevana.eav-cep-assist" 
                   ExtensionBundleVersion="1.0.0" 
                   ExtensionBundleName="EAV Ingest Assistant">
```

**Key Manifest Elements:**

#### 1. **ExecutionEnvironment** - Host Definition
```xml
<HostList>
  <Host Name="PPRO" Version="[14.0,99.9]" />  <!-- Premiere Pro versions 14.0 - 99.9 -->
</HostList>
<LocaleList>
  <Locale Code="All" />  <!-- All locales supported -->
</LocaleList>
<RequiredRuntimeList>
  <RequiredRuntime Name="CSXS" Version="9.0" />  <!-- CEP version 9.0 -->
</RequiredRuntimeList>
```

#### 2. **DispatchInfo** - Panel Configuration
```xml
<Resources>
  <MainPath>./index.html</MainPath>           <!-- HTML UI entry point -->
  <ScriptPath>./jsx/host.jsx</ScriptPath>     <!-- ExtendScript path -->
  <CEFCommandLine>
    <Parameter>--enable-nodejs</Parameter>    <!-- Node.js support -->
    <Parameter>--mixed-context</Parameter>    <!-- Mixed JS/ExtendScript context -->
  </CEFCommandLine>
</Resources>
```

#### 3. **Lifecycle** - Auto-visibility
```xml
<Lifecycle>
  <AutoVisible>true</AutoVisible>  <!-- Panel visible on PP startup -->
</Lifecycle>
```

#### 4. **UI Geometry** - Panel Dimensions
```xml
<UI>
  <Type>Panel</Type>
  <Menu>EAV Ingest Assistant</Menu>
  <Geometry>
    <Size>
      <Height>200</Height>     <!-- Default height -->
      <Width>500</Width>       <!-- Default width -->
    </Size>
    <MinSize>
      <Height>150</Height>     <!-- Minimum resizable -->
      <Width>400</Width>
    </MinSize>
    <MaxSize>
      <Height>400</Height>     <!-- Maximum resizable -->
      <Width>1200</Width>
    </MaxSize>
  </Geometry>
</UI>
```

### Debug Configuration (.debug)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.elevana.eav-cep-assist.panel">
    <HostList>
      <Host Name="PPRO" Port="8092"/>  <!-- Debug port for Chrome DevTools -->
    </HostList>
  </Extension>
</ExtensionList>
```

**How it works:**
- .debug file overrides manifest.xml during development
- Allows remote debugging via Chrome DevTools on `localhost:8092`
- Enables live development/hot reload workflow

---

## 3. HOST APPLICATION COMMUNICATION PATTERNS

### 3.1 ExtendScript Bridge (jsx/host.jsx)

The ExtendScript module uses a **Module Pattern** to encapsulate PP API calls:

```javascript
var EAVIngest = (function() {
    'use strict';
    
    // Private functions (not exposed)
    function getSelectedClips() { ... }
    function findProjectItemByNodeId(parentItem, nodeId) { ... }
    
    // Public API
    return {
        getSelectedClips: getSelectedClips,
        updateClipMetadata: updateClipMetadata,
        getAllProjectClips: getAllProjectClips,
        selectClip: selectClip,
        openInSourceMonitor: openInSourceMonitor,
        parseStructuredNaming: parseStructuredNaming
    };
})();

// Make functions available to CEP panel
EAVIngest;
```

**Design Patterns:**
- **Module Pattern:** Encapsulation + public API
- **Asynchronous Communication:** Functions return JSON strings
- **Error Handling:** Always return `{ success: false, error: "message" }`

### 3.2 Key ExtendScript Functions

#### A. Get Selected Clips

```javascript
function getSelectedClips() {
    var project = app.project;
    if (!project) return JSON.stringify({ error: "No active project" });
    
    var selection = project.getSelection();
    var clips = [];
    
    for (var i = 0; i < selection.length; i++) {
        var item = selection[i];
        // Only process video/image items, not bins
        if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {
            clips.push({
                nodeId: item.nodeId,                              // Unique ID for lookup
                name: item.name || "",                            // Filename
                treePath: item.treePath || "",                    // Bin path
                mediaPath: item.getMediaPath() || "",             // File path
                tapeName: item.getProjectColumnsMetadata().Tape || "",
                description: item.getProjectColumnsMetadata().Description || "",
                shot: item.getProjectColumnsMetadata().Shot || "",
                videoFrameRate: item.getFootageInterpretation().frameRate || "",
                duration: item.getOutPoint().seconds || 0,
                type: item.type
            });
        }
    }
    
    return JSON.stringify({ clips: clips });
}
```

**Key Pattern: nodeId Lookup**
- `nodeId` is used as a unique identifier for clips
- Survives across selection changes
- Enables previous/next navigation

#### B. Update Clip Metadata

```javascript
function updateClipMetadata(nodeId, metadata) {
    var project = app.project;
    var item = findProjectItemByNodeId(project.rootItem, nodeId);
    
    if (!item) return JSON.stringify({ success: false, error: "Clip not found" });
    
    try {
        // Update Name field (visible in Project Panel)
        if (metadata.name !== undefined) {
            item.name = metadata.name;
        }
        
        // Update Tape Name field (survives offline)
        if (metadata.tapeName !== undefined) {
            item.setProjectColumnsMetadata(["Tape"], [metadata.tapeName]);
        }
        
        // Update Description field (survives offline)
        if (metadata.description !== undefined) {
            item.setProjectColumnsMetadata(["Description"], [metadata.description]);
        }
        
        // Update Shot field (survives offline)
        if (metadata.shot !== undefined) {
            item.setProjectColumnsMetadata(["Shot"], [metadata.shot]);
        }
        
        return JSON.stringify({
            success: true,
            updatedName: item.name
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: "Failed to update metadata: " + e.toString()
        });
    }
}
```

**Key APIs:**
- `item.name` - Visible filename in Project Panel (directly writable)
- `item.setProjectColumnsMetadata(fields[], values[])` - Metadata update for offline persistence
- Fields: "Tape", "Description", "Shot", "Keywords"

#### C. Helper: Recursive Node Search

```javascript
function findProjectItemByNodeId(parentItem, nodeId) {
    if (parentItem.nodeId === nodeId) {
        return parentItem;
    }
    
    // Search children recursively
    if (parentItem.children && parentItem.children.numItems > 0) {
        for (var i = 0; i < parentItem.children.numItems; i++) {
            var found = findProjectItemByNodeId(parentItem.children[i], nodeId);
            if (found) return found;
        }
    }
    
    return null;
}
```

**Tree Navigation Pattern:**
- PP project is a tree of bins and clips
- Must traverse recursively to find items
- Store nodeId for fast lookup

#### D. Open in Source Monitor

```javascript
function openInSourceMonitor(nodeId) {
    var item = findProjectItemByNodeId(project.rootItem, nodeId);
    try {
        app.sourceMonitor.openProjectItem(item);
        return JSON.stringify({ success: true });
    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
}
```

### 3.3 JavaScript to ExtendScript Communication (js/main.js)

#### CSInterface Initialization

```javascript
// Initialize CSInterface - the communication bridge
var csInterface = new CSInterface();

// Current state
var currentClip = null;
var allProjectClips = [];
var currentClipIndex = -1;

// UI Elements cache
var elements = {
    clipName: document.getElementById('clipName'),
    clipPath: document.getElementById('clipPath'),
    id: document.getElementById('id'),
    location: document.getElementById('location'),
    // ... more elements
};
```

**Key Pattern:**
- CSInterface is a global browser object provided by CEP
- Communication is through `evalScript()` method
- Results are JSON strings (parsed in callbacks)

#### evalScript Pattern - Request/Response

```javascript
// Request: evalScript with callback
csInterface.evalScript('EAVIngest.getSelectedClips()', function(result) {
    try {
        var data = JSON.parse(result);  // Parse response
        
        if (data.error) {
            showStatus(data.error, 'error');
            clearForm();
            return;
        }
        
        if (data.clips && data.clips.length > 0) {
            currentClip = data.clips[0];
            loadClipIntoForm(currentClip);
            loadAllProjectClips();
            showStatus('Clip loaded: ' + currentClip.name, 'success');
        }
    } catch (e) {
        console.error('Error parsing result:', e);
        showStatus('Error loading clip', 'error');
    }
});
```

**evalScript Pattern:**
```
Panel (JS)  ──evalScript()──>  ExtendScript
                                    │
                              Calls app.project
                                    │
            <──JSON result──────────┘
```

#### Complex Parameter Passing

```javascript
// Building metadata JSON with proper escaping
var metadata = {
    name: generatedName,
    tapeName: currentClip.name,
    description: elements.metadata.value.trim(),
    shot: elements.shotType.value
};

var metadataJson = JSON.stringify(metadata).replace(/"/g, '\\"');
var script = 'EAVIngest.updateClipMetadata("' + currentClip.nodeId + 
             '", JSON.parse("' + metadataJson + '"))';

csInterface.evalScript(script, function(result) {
    var data = JSON.parse(result);
    // Handle response
});
```

**Escaping Pattern:**
- JSON strings must escape quotes: `"` → `\"`
- Single quotes can be literal
- Parameter injection must be URL-safe

#### Polling for Selection Changes

```javascript
// CEP doesn't have direct selection change events
// Solution: Poll every 2 seconds
setInterval(checkSelectionChange, 2000);

var lastClipNodeId = null;
function checkSelectionChange() {
    csInterface.evalScript('EAVIngest.getSelectedClips()', function(result) {
        try {
            var data = JSON.parse(result);
            if (data.clips && data.clips.length > 0) {
                var newNodeId = data.clips[0].nodeId;
                if (newNodeId !== lastClipNodeId) {
                    lastClipNodeId = newNodeId;
                    loadSelectedClip();  // UI auto-updates
                }
            }
        } catch (e) {
            // Ignore errors during polling
        }
    });
}
```

**Polling Pattern:**
- CEP doesn't provide real-time selection events
- Workaround: Poll every 2 seconds
- Check if selection changed via nodeId comparison
- Only reload if changed (avoid flicker)

---

## 4. PANEL LIFECYCLE & INITIALIZATION

### Initialization Sequence

```
PP Startup
    ↓
Load manifest.xml (CSXS)
    ↓
Load index.html (CEP browser context)
    ↓
Include CSInterface.js (establish __adobe_cep__)
    ↓
Include main.js (initialize panel)
    ↓
DOMContentLoaded event
    ↓
init() function runs
    ├── setupEventListeners()
    ├── loadSelectedClip()  ←── Fetch current selection via evalScript
    └── Ready for user interaction
```

### Panel Initialization Code

```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('EAV Ingest Assistant initializing...');
    setupEventListeners();
    loadSelectedClip();
    console.log('Panel initialized');
}

function setupEventListeners() {
    // Button events
    elements.refreshBtn.addEventListener('click', function() {
        loadSelectedClip();
    });
    
    // Form field changes trigger name preview update
    elements.location.addEventListener('input', updateGeneratedName);
    elements.subject.addEventListener('input', updateGeneratedName);
    elements.action.addEventListener('input', updateGeneratedName);
    elements.shotType.addEventListener('change', updateGeneratedName);
    
    // Navigation
    elements.prevBtn.addEventListener('click', navigateToPrevious);
    elements.nextBtn.addEventListener('click', navigateToNext);
    
    // Primary actions
    elements.openSourceBtn.addEventListener('click', openInSourceMonitor);
    elements.applyBtn.addEventListener('click', applyMetadata);
    
    // Selection change polling
    setInterval(checkSelectionChange, 2000);
}
```

### State Management Pattern

```javascript
// Global state (closure-scoped)
var currentClip = null;           // Currently selected clip object
var allProjectClips = [];         // Cache of all clips in project
var currentClipIndex = -1;        // Position in navigation
var lastClipNodeId = null;        // For change detection

// Element cache (avoid repeated DOM queries)
var elements = {
    clipName: document.getElementById('clipName'),
    // ... 15+ cached elements
};
```

---

## 5. UI FORM LAYOUT & DATA BINDING

### HTML Structure (index.html)

```html
<div class="panel-container">
  <!-- Header: Clip info + Refresh button -->
  <div class="header">
    <div class="clip-info">
      <span id="clipName">No clip selected</span>
      <span id="clipPath"></span>
    </div>
    <button id="refreshBtn" class="icon-btn">Refresh</button>
  </div>
  
  <!-- Form Strip: Horizontal field layout -->
  <div class="form-strip">
    <div class="form-group compact">
      <label for="id">ID</label>
      <input type="text" id="id" readonly class="readonly-field">
    </div>
    
    <div class="form-group">
      <label for="location">Location</label>
      <input type="text" id="location" list="locationList">
      <datalist id="locationList">
        <option value="kitchen">
        <!-- ... more options -->
      </datalist>
    </div>
    
    <!-- Subject, Action, Shot Type similar to Location -->
  </div>
  
  <!-- Name Preview -->
  <div class="name-preview">
    <label>Generated Name:</label>
    <div id="generatedName" class="generated-name-text">-</div>
  </div>
  
  <!-- Metadata Tags -->
  <div class="metadata-section">
    <label for="metadata">Metadata Tags (comma-separated):</label>
    <input type="text" id="metadata">
  </div>
  
  <!-- Action Bar: Navigation + Primary buttons -->
  <div class="action-bar">
    <div class="nav-buttons">
      <button id="prevBtn" class="nav-btn">◀ Previous</button>
      <button id="nextBtn" class="nav-btn">Next ▶</button>
    </div>
    <div class="action-buttons">
      <button id="openSourceBtn" class="secondary-btn">Open in Source Monitor</button>
      <button id="applyBtn" class="primary-btn">Apply to Premiere</button>
    </div>
  </div>
  
  <!-- Status Messages -->
  <div id="statusMsg" class="status-msg"></div>
</div>
```

### Form Data Flow

```
User selects clip in PP
    ↓
Polling detects change (2s loop)
    ↓
evalScript('EAVIngest.getSelectedClips()') → JSON
    ↓
loadClipIntoForm(clip)
    ├── Parse ID from filename: /^(\d{8})/
    ├── Parse structured components: id-location-subject-action-shotType
    ├── Load metadata from PP fields
    └── updateGeneratedName() → preview display
    ↓
User edits form fields
    ↓
input/change events → updateGeneratedName()
    ├── Build name: [id]-[location]-[subject]-[action]-[shotType]
    ├── Display in #generatedName
    └── Only includes visible fields
    ↓
User clicks "Apply to Premiere"
    ↓
applyMetadata()
    ├── Build metadata object
    ├── evalScript('EAVIngest.updateClipMetadata(...)')
    ├── Update PP project columns
    └── Show success message
```

### Structured Naming Parsing

```javascript
function parseStructuredComponents(name) {
    // Input: "12345678-kitchen-oven-cleaning-CU.mp4"
    var nameWithoutExt = name.replace(/\.[^.]+$/, '');
    var parts = nameWithoutExt.split('-');
    
    // Format: id-location-subject-action-shotType
    var components = {};
    if (parts.length >= 5) {
        components.location = parts[1] || '';      // kitchen
        components.subject = parts[2] || '';       // oven
        components.action = parts[3] || '';        // cleaning
        components.shotType = parts[4] || '';      // CU
    }
    
    return components;
}

function updateGeneratedName() {
    var id = elements.id.value;
    var location = elements.location.value.trim();
    var subject = elements.subject.value.trim();
    var action = elements.action.value.trim();
    var shotType = elements.shotType.value;
    
    var parts = [];
    if (id) parts.push(id);
    if (location) parts.push(location);
    if (subject) parts.push(subject);
    
    // Action only for videos (conditional display)
    if (elements.actionGroup.style.display !== 'none' && action) {
        parts.push(action);
    }
    
    if (shotType) parts.push(shotType);
    
    var generatedName = parts.length > 0 ? parts.join('-') : '-';
    elements.generatedName.textContent = generatedName;
}
```

---

## 6. STYLING & THEME

### CSS Design Patterns (style.css)

#### Adobe Dark Theme

```css
/* Color Palette */
body {
    background-color: #2b2b2b;      /* Main dark background */
    color: #d0d0d0;                 /* Light text */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial;
    font-size: 12px;
}

/* Input Fields */
.form-group input,
.form-group select {
    background-color: #404040;       /* Input background */
    border: 1px solid #505050;       /* Subtle border */
    color: #e0e0e0;                  /* Light input text */
}

.form-group input:focus,
.form-group select:focus {
    border-color: #0078d4;            /* Adobe blue focus */
    background-color: #454545;        /* Lighter on focus */
}

/* Button States */
.primary-btn {
    background-color: #0078d4;        /* Adobe blue */
    color: #ffffff;
}

.primary-btn:hover:not(:disabled) {
    background-color: #005a9e;        /* Darker blue */
}

.primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Status Messages */
.status-msg.success {
    background-color: #1a3a1a;        /* Dark green */
    border: 1px solid #2d5f2d;
    color: #6bcf6b;
}

.status-msg.error {
    background-color: #3a1a1a;        /* Dark red */
    border: 1px solid #5f2d2d;
    color: #cf6b6b;
}

.status-msg.info {
    background-color: #1a2a3a;        /* Dark blue */
    border: 1px solid #2d4a5f;
    color: #6b9fcf;
}
```

#### Horizontal Strip Layout

```css
.form-strip {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;                  /* Wraps on narrow panels */
    padding: 8px;
    background-color: #323232;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;                           /* Grows to fill space */
    min-width: 100px;
}

.form-group.compact {
    flex: 0 0 80px;                    /* Fixed width for ID field */
}

/* Responsive adjustments */
@media (max-width: 500px) {
    .form-strip {
        flex-direction: column;         /* Stack vertically on narrow screens */
    }
    
    .action-bar {
        flex-direction: column;
    }
}
```

#### Name Preview Display

```css
.generated-name-text {
    font-family: "Courier New", Courier, monospace;  /* Monospace for filename */
    font-size: 13px;
    color: #4ec9b0;                   /* Cyan/teal (terminal-like) */
    font-weight: 500;
    word-break: break-all;            /* Wrap long names */
}
```

---

## 7. BUILD & PACKAGING CONFIGURATION

### package.json Structure

```json
{
  "name": "eav-cep-assist",
  "version": "1.0.0",
  "description": "Adobe CEP panel for Premiere Pro",
  
  "cep": {
    "id": "com.elevana.eav-cep-assist",
    "version": "1.0.0",
    "hosts": ["PPRO"],              /* Target host */
    "minVersion": "14.0",           /* Minimum PP version */
    "debugPort": 8092               /* Development debug port */
  },
  
  "repository": {
    "type": "git",
    "url": "https://github.com/elevanaltd/eav-cep-assist.git"
  }
}
```

### Installation Pattern (macOS)

```bash
# 1. Enable CEP Debug Mode (development only)
defaults write com.adobe.CSXS.9 PlayerDebugMode 1

# 2. Copy extension to CEP extensions directory
cp -r eav-cep-assist ~/Library/Application\ Support/Adobe/CEP/extensions/

# 3. Restart Premiere Pro

# 4. Open panel: Window → Extensions → EAV Ingest Assistant
```

### Installation Pattern (Windows)

```cmd
# 1. Set registry key:
# HKEY_CURRENT_USER/Software/Adobe/CSXS.9
# PlayerDebugMode = "1" (String)

# 2. Copy to:
# C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\

# 3. Restart Premiere Pro
```

### Extension Discovery by PP

**PP Startup Process:**
1. Scans CEP extensions directory for `CSXS/manifest.xml` files
2. Reads `ExtensionBundleId` and version
3. Validates host compatibility (PPRO version check)
4. Loads and caches manifest
5. Registers in Window → Extensions menu
6. CEP runtime loads HTML + JS on first user interaction

---

## 8. NAVIGATION & CLIP CYCLING PATTERN

### All Project Clips Loading

```javascript
function loadAllProjectClips() {
    csInterface.evalScript('EAVIngest.getAllProjectClips()', function(result) {
        try {
            var data = JSON.parse(result);
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
```

### Previous/Next Navigation

```javascript
function navigateToPrevious() {
    if (currentClipIndex > 0) {
        var prevClip = allProjectClips[currentClipIndex - 1];
        selectAndLoadClip(prevClip.nodeId);
    }
}

function navigateToNext() {
    if (currentClipIndex < allProjectClips.length - 1) {
        var nextClip = allProjectClips[currentClipIndex + 1];
        selectAndLoadClip(nextClip.nodeId);
    }
}

function selectAndLoadClip(nodeId) {
    csInterface.evalScript('EAVIngest.selectClip("' + nodeId + '")', function(result) {
        try {
            var data = JSON.parse(result);
            if (data.success) {
                // Wait a bit for PP to update, then load
                setTimeout(loadSelectedClip, 100);
            }
        } catch (e) {
            console.error('Error selecting clip:', e);
        }
    });
}

function updateNavigationButtons() {
    elements.prevBtn.disabled = currentClipIndex <= 0;
    elements.nextBtn.disabled = currentClipIndex >= allProjectClips.length - 1 || 
                                allProjectClips.length === 0;
}
```

---

## 9. ERROR HANDLING PATTERNS

### Consistent Error Response Format

```javascript
// Success response
{ success: true, updatedName: "12345678-kitchen-oven-CU" }

// Error response  
{ success: false, error: "Clip not found" }

// Data response
{ clips: [...], error: null }

// No data available
{ error: "No active project" }
```

### UI Error Handling

```javascript
function showStatus(message, type) {
    // type: 'success', 'error', or 'info'
    elements.statusMsg.textContent = message;
    elements.statusMsg.className = 'status-msg ' + type;
    
    // Auto-hide success/info after 3 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(function() {
            elements.statusMsg.style.display = 'none';
        }, 3000);
    }
    // Errors stay visible
}
```

### Try/Catch for JSON Parsing

```javascript
try {
    var data = JSON.parse(result);
    
    if (data.error) {
        showStatus(data.error, 'error');
        return;
    }
    
    // Process data...
} catch (e) {
    console.error('Error parsing result:', e);
    showStatus('Error loading clip', 'error');
}
```

---

## 10. PANEL LIFECYCLE: DETAILED WORKFLOW

### Complete Metadata Update Flow

```
┌─────────────────────────────────────────────────────────┐
│  User selects clip in Premiere Pro Project Panel       │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    ┌───▼─────────────┐      ┌────────▼────┐
    │ Polling detects │      │ Polling on  │
    │ change every 2s │      │ focus/blur  │
    └───┬─────────────┘      └──────┬──────┘
        │                           │
        └──────────────┬────────────┘
                       │
        ┌──────────────▼──────────────┐
        │ loadSelectedClip()           │
        │ (calls evalScript)          │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ evalScript('EAVIngest.getSelected') │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │ ExtendScript (host.jsx)                     │
        │ ┌────────────────────────────────────────┐ │
        │ │ var project = app.project              │ │
        │ │ var selection = project.getSelection() │ │
        │ │ Loop and extract clip data             │ │
        │ │ Return JSON { clips: [...] }           │ │
        │ └────────────────────────────────────────┘ │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │ Panel receives JSON in callback │
        └──────────────┬──────────────────┘
                       │
        ┌──────────────▼─────────────────────┐
        │ loadClipIntoForm(clip)              │
        │ ├─ Set clipName, clipPath           │
        │ ├─ Parse ID: /^(\d{8})/            │
        │ ├─ Parse components: id-loc-subj   │
        │ ├─ Load form fields                 │
        │ └─ updateGeneratedName()            │
        └──────────────┬─────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ Panel displays form with current    │
        │ clip metadata ready for editing     │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ User edits form fields              │
        │ ├─ Type in location field           │
        │ ├─ Change subject dropdown          │
        │ └─ input/change events trigger      │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ updateGeneratedName()               │
        │ ├─ Read current form values         │
        │ ├─ Build name: id-loc-subj-action  │
        │ ├─ Validate (skip hidden fields)   │
        │ └─ Display live preview             │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ User clicks "Apply to Premiere"     │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ applyMetadata()                     │
        │ ├─ Validate generated name not "-" │
        │ ├─ Build metadata object           │
        │ └─ Call evalScript with parameters │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │ evalScript('EAVIngest.updateClipMetadata')  │
        │ with escaped JSON parameters               │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────┐
        │ ExtendScript (host.jsx)                 │
        │ ┌──────────────────────────────────────┤
        │ │ Find clip by nodeId (tree search)    │
        │ │ Update item.name = new name          │
        │ │ Update metadata via                  │
        │ │   setProjectColumnsMetadata()        │
        │ │ Return { success: true, ... }        │
        │ └──────────────────────────────────────┤
        └──────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ Panel receives success response     │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │ Show success message (3s auto-hide) │
        │ Update UI to reflect changes        │
        │ Optionally navigate to next clip    │
        └──────────────────────────────────────┘
```

---

## 11. BEST PRACTICES DEMONSTRATED

### 1. **Modular Architecture**
- ExtendScript module pattern (private functions + public API)
- Separation of concerns (UI ↔ ExtendScript bridge)
- Stateless functions where possible

### 2. **Robust Communication**
- Always use JSON serialization
- Proper error handling in try/catch
- Consistent response format
- Callback-based (no blocking)

### 3. **UX Patterns**
- Real-time name preview
- Disabled state for buttons
- Status messages with auto-dismiss
- Form validation before submit

### 4. **Performance**
- Element caching (avoid repeated DOM queries)
- Polling with change detection (not every event)
- Lazy load all project clips only when needed
- Conditional field visibility (reduce noise)

### 5. **Accessibility**
- Semantic HTML (labels with inputs)
- Keyboard navigation (native input behavior)
- Consistent color contrast (Adobe theme)
- Clear status feedback

### 6. **Maintainability**
- Descriptive function names
- Comments on complex logic (ExtendScript details)
- Consistent indentation
- Documented manifest parameters

---

## 12. INTEGRATION WITH PREMIERE PRO

### PP Project Architecture Integration

```
Premiere Pro Application
├── Project Panel
│   └── Root Item
│       ├── Bin 1
│       │   ├── Clip 1 (nodeId: xyz1)
│       │   │   ├── Name: "12345678-kitchen-oven"
│       │   │   ├── Metadata
│       │   │   │   ├── Tape: "EB001537-original.mp4"
│       │   │   │   ├── Description: "Kitchen counter details"
│       │   │   │   └── Shot: "CU"
│       │   │   └── Footage (offline possible)
│       │   └── Clip 2 (nodeId: xyz2)
│       └── Bin 2
│
├── Source Monitor (opened via panel button)
│   └── Displays selected clip for review
│
└── EAV Ingest Assistant Panel (CEP extension)
    ├── Detects Bin selection changes
    ├── Loads clip metadata
    ├── Allows editing
    └── Updates PP project metadata via ExtendScript
```

### Why This Design Works

1. **Offline Support:** Metadata stored in `.prproj` file, not source files
2. **Real-time Integration:** Updates visible immediately in PP bins
3. **No File Access:** Works even when source files are offline/unmounted
4. **Native Workflow:** Panel lives in PP workspace, no app switching
5. **Search Integration:** PP's search finds metadata immediately

---

## SUMMARY: KEY ARCHITECTURAL PATTERNS

| Pattern | Implementation | Purpose |
|---------|---|---|
| **Module Pattern** | ExtendScript closure | Encapsulation + API |
| **JSON RPC** | evalScript + callback | PP ↔ Panel communication |
| **Polling** | 2s interval with change detection | Selection change detection |
| **Element Caching** | Cache DOM references in object | Performance |
| **State Machine** | currentClip, currentClipIndex | Navigation state |
| **Two-way Binding** | input → updateGeneratedName → display | Form preview |
| **Recursive Tree Search** | findProjectItemByNodeId() | PP project tree traversal |
| **Structured Naming** | id-location-subject-action-shotType | Metadata schema |
| **Async Communication** | evalScript callbacks | Non-blocking PP integration |
| **Dark Theme** | Adobe color palette (#2b2b2b, #0078d4) | Native PP appearance |

