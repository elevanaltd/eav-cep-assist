# CEP Panel Quick Reference Guide
## EAV Ingest Assistant - Premiere Pro Integration

---

## CRITICAL FILES & LOCATIONS

### Manifest & Configuration
- **`CSXS/manifest.xml`** - Extension declaration, host compatibility, panel geometry
- **`.debug`** - Debug port configuration (localhost:8092)
- **`package.json`** - Metadata and CEP config

### ExtendScript Bridge (Host Communication)
- **`jsx/host.jsx`** (7.8 KB) - Module containing all PP API calls
  - `getSelectedClips()` - Fetch selected clips
  - `updateClipMetadata(nodeId, metadata)` - Update PP project columns
  - `getAllProjectClips()` - Get all clips for navigation
  - `selectClip(nodeId)` - Select clip in Project Panel
  - `openInSourceMonitor(nodeId)` - Open in Source Monitor
  - `findProjectItemByNodeId()` - Recursive tree search helper

### Panel JavaScript
- **`js/CSInterface.js`** (42.8 KB) - Adobe CEP library (DO NOT MODIFY)
- **`js/main.js`** (14.6 KB) - Panel logic and event handlers
  - `init()` - Initialization on DOMContentLoaded
  - `loadSelectedClip()` - Fetch current selection via evalScript
  - `loadClipIntoForm(clip)` - Populate form from clip data
  - `applyMetadata()` - Save metadata to PP
  - `checkSelectionChange()` - Polling loop (2s interval)
  - `updateGeneratedName()` - Live name preview

### UI & Styling
- **`index.html`** (5.4 KB) - Form layout with datalists
  - Header with clip info
  - Form strip with ID, Location, Subject, Action, Shot Type
  - Generated name preview
  - Metadata tags input
  - Navigation buttons (Previous/Next)
  - Action buttons (Open in Source Monitor / Apply to Premiere)

- **`css/style.css`** (6.6 KB) - Adobe dark theme
  - Color palette: #2b2b2b (dark), #0078d4 (blue), #e0e0e0 (light text)
  - Responsive horizontal strip layout
  - Status message styling (success/error/info)
  - Button states (hover, disabled)

---

## KEY COMMUNICATION PATTERNS

### evalScript Pattern (JS → ExtendScript)

```javascript
// Request
csInterface.evalScript('EAVIngest.functionName(arg1, arg2)', callback);

// Callback receives JSON string
function(result) {
    var data = JSON.parse(result);
    // data.success, data.error, data.clips, etc.
}
```

### Parameter Escaping

```javascript
var metadata = { name: "test", description: "desc" };
var json = JSON.stringify(metadata).replace(/"/g, '\\"');
var script = 'EAVIngest.func("' + nodeId + '", JSON.parse("' + json + '"))';
```

### Error Response Format

```javascript
// Success
{ success: true, updatedName: "..." }

// Error
{ success: false, error: "message" }

// Data
{ clips: [...], error: null }

// No project
{ error: "No active project" }
```

### Selection Change Detection

```javascript
// Poll every 2 seconds (CEP limitation - no real-time events)
setInterval(checkSelectionChange, 2000);

// Compare nodeId to detect changes
if (newNodeId !== lastClipNodeId) {
    loadSelectedClip(); // Auto-update UI
}
```

---

## STRUCTURED NAMING FORMAT

### Videos
```
{8-digit-id}-{location}-{subject}-{action}-{shotType}
Example: 12345678-kitchen-oven-cleaning-CU
```

### Images
```
{8-digit-id}-{location}-{subject}-{shotType}
Example: 12345678-kitchen-sink-WS
```

### Shot Types
- **WS** = Wide Shot
- **MID** = Medium Shot
- **CU** = Close Up
- **UNDER** = Underslung
- **FP** = First Person
- **TRACK** = Tracking Shot
- **ESTAB** = Establishing

---

## PREMIERE PRO API CALLS (ExtendScript)

### Project Structure
```javascript
var project = app.project;
var selection = project.getSelection();          // Selected clips
var rootItem = project.rootItem;                  // Root bin

// Clip properties
item.nodeId                                       // Unique identifier
item.name                                         // Filename (editable)
item.type                                         // ProjectItemType.CLIP/FILE
item.treePath                                     // Bin path
item.getMediaPath()                              // File path
item.getFootageInterpretation().frameRate        // Video FPS
item.getOutPoint().seconds                       // Duration
```

### Metadata Access
```javascript
// Read metadata
var tape = item.getProjectColumnsMetadata().Tape;
var desc = item.getProjectColumnsMetadata().Description;
var shot = item.getProjectColumnsMetadata().Shot;

// Update metadata (survives offline)
item.setProjectColumnsMetadata(["Tape"], ["value"]);
item.setProjectColumnsMetadata(["Description"], ["value"]);
item.setProjectColumnsMetadata(["Shot"], ["value"]);
```

### Source Monitor
```javascript
app.sourceMonitor.openProjectItem(item);
```

### Selection
```javascript
item.select();  // Selects clip in Project Panel
```

---

## INSTALLATION INSTRUCTIONS

### macOS Development Setup

```bash
# 1. Enable debug mode
defaults write com.adobe.CSXS.9 PlayerDebugMode 1

# 2. Create extensions directory
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions/

# 3. Copy extension
cp -r eav-cep-assist ~/Library/Application\ Support/Adobe/CEP/extensions/

# 4. Restart Premiere Pro

# 5. Access in Premiere: Window → Extensions → EAV Ingest Assistant

# 6. Debug in Chrome: localhost:8092
```

### Windows Development Setup

```cmd
# 1. Set registry key
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d "1"

# 2. Copy extension
Copy folder to: C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\

# 3. Restart Premiere Pro

# 4. Access in Premiere: Window → Extensions → EAV Ingest Assistant
```

---

## STATE MANAGEMENT

```javascript
// Global variables (in closure)
var currentClip = null;           // Currently selected clip object
var allProjectClips = [];         // Cache of all clips
var currentClipIndex = -1;        // Position in navigation array
var lastClipNodeId = null;        // Previous selection (for change detection)

// Element cache (DOM references)
var elements = {
    clipName, clipPath, id, location, subject, action, shotType,
    metadata, generatedName, refreshBtn, prevBtn, nextBtn,
    openSourceBtn, applyBtn, statusMsg, actionGroup
};
```

---

## PANEL INITIALIZATION SEQUENCE

1. **PP Startup** → Scans `~/Library/Application Support/Adobe/CEP/extensions/`
2. **Manifest Load** → Reads `CSXS/manifest.xml` for host/version compatibility
3. **HTML Load** → Loads `index.html` in CEP browser context
4. **Script Load** → Includes `CSInterface.js` and `main.js`
5. **DOM Ready** → Fires `DOMContentLoaded` event
6. **init()** → Called when DOM ready
7. **setupEventListeners()** → Attach handlers, start polling
8. **loadSelectedClip()** → Fetch current selection via evalScript
9. **Ready** → Panel waits for user interaction

---

## USER WORKFLOW

```
1. User selects clip in Project Panel
   ↓
2. Panel polls and detects change (within 2 seconds)
   ↓
3. Loads clip metadata via evalScript
   ↓
4. Populates form fields (ID auto-extracted)
   ↓
5. User types in location, subject, action, shot type
   ↓
6. Live preview shows generated name
   ↓
7. User clicks "Apply to Premiere"
   ↓
8. Metadata written to PP project columns
   ↓
9. Name visible in Project Panel
   ↓
10. Next clip available via Previous/Next buttons
```

---

## DEBUGGING TIPS

### Enable Debug Mode
```bash
# macOS
defaults write com.adobe.CSXS.9 PlayerDebugMode 1

# Windows
# HKEY_CURRENT_USER\Software\Adobe\CSXS.9 → PlayerDebugMode = "1"
```

### Chrome DevTools
1. Open Chrome
2. Navigate to `localhost:8092`
3. Full debugging capabilities (console, network, DOM inspector)

### Console Logging
```javascript
console.log('message');      // Visible in Chrome DevTools
console.error('error msg');  // Red in console
```

### Check PP Connection
```javascript
// In console, test ExtendScript call
csInterface.evalScript('EAVIngest.getSelectedClips()', function(result) {
    console.log('Result:', result);
});
```

---

## PERFORMANCE CONSIDERATIONS

### Polling Interval: 2 Seconds
- Balances responsiveness vs CPU usage
- Acceptable for UI that changes infrequently
- No direct selection change events in CEP

### Element Caching
- Cache all DOM element references at init
- Avoid repeated `getElementById()` calls
- Updates through cached references

### Lazy Loading
- Load all project clips only on first clip selection
- Reuse cached clip list for navigation
- Don't fetch data until needed

### JSON Serialization
- ExtendScript only communicates via JSON strings
- Parse responses in callbacks
- Escape quotes properly in parameters

---

## COMMON ISSUES & SOLUTIONS

### Panel Not Appearing in Window → Extensions
**Solution:** Check manifest.xml, restart PP, verify path is correct

### "No clips selected" error
**Solution:** Click in Project Panel, select a clip, wait 2 seconds for poll

### Metadata not updating
**Solution:** Check nodeId is valid, ensure clip is video/image (not bin)

### Chrome DevTools not connecting
**Solution:** Enable debug mode, check port 8092, restart PP

### JSON parsing error
**Solution:** Check quote escaping in evalScript parameters

---

## EXTENSION BUNDLE ID
```
com.elevana.eav-cep-assist
```

## TARGET HOSTS
```
PPRO (Premiere Pro) versions 14.0 - 99.9
```

## CEP VERSION
```
CSXS 9.0
```

## DEFAULT PANEL SIZE
```
Width: 500px (min 400, max 1200)
Height: 200px (min 150, max 400)
```

## DEBUG PORT
```
8092
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-10  
**Target Audience:** CEP Panel Developers, Premiere Pro Plugin Developers
