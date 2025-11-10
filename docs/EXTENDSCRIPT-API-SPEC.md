# ExtendScript API Specification - Self-Contained Panel

**Document Version:** 1.0
**Date:** 2025-11-10
**Related:** ADR-002, COMPONENT-ARCHITECTURE.md

---

## Overview

This document specifies the ExtendScript API functions required for the self-contained CEP panel architecture. It extends the existing `EAVIngest` module with new functions for proxy detection, enhanced clip metadata, and video playback support.

---

## Existing Functions (from host.jsx)

### ✅ Already Implemented

| Function | Purpose | Status |
|----------|---------|--------|
| `getSelectedClips()` | Get clips selected in Project Panel | ✅ Exists (deprecated for self-contained) |
| `getAllProjectClips()` | Get all clips in project | ✅ Exists (enhanced needed) |
| `updateClipMetadata(nodeId, metadata)` | Update clip metadata | ✅ Exists |
| `selectClip(nodeId)` | Select clip in Project Panel | ✅ Exists |
| `openInSourceMonitor(nodeId)` | Open clip in Source Monitor | ✅ Exists |
| `findProjectItemByNodeId(parentItem, nodeId)` | Recursive tree search | ✅ Exists (helper) |

---

## New Functions Required

### 1. Enhanced Clip Metadata (getAllProjectClipsEnhanced)

**Purpose:** Return all project clips with additional metadata needed for video player and proxy detection.

**Function Signature:**
```javascript
function getAllProjectClipsEnhanced()
```

**Return Value:**
```json
{
  "clips": [
    {
      "nodeId": "xyz123",
      "name": "kitchen-oven-cleaning-CU.mov",
      "treePath": "Project/Footage/Kitchen",
      "mediaPath": "/Volumes/Media/RAW/kitchen-oven-cleaning-CU.mov",

      // NEW: Proxy detection
      "hasProxy": true,
      "proxyPath": "/Volumes/Media/Proxies/kitchen-oven-cleaning-CU_Proxy.mov",
      "proxyAttached": true,

      // NEW: Video properties
      "width": 1920,
      "height": 1080,
      "frameRate": 23.976,
      "duration": 15.5,
      "codec": "Apple ProRes 422",

      // Existing metadata
      "tapeName": "EB001537-original.mov",
      "description": "Kitchen counter details",
      "shot": "CU",

      // NEW: Metadata status
      "hasMetadata": true,

      "type": "CLIP"
    }
  ]
}
```

**Implementation:**
```javascript
function getAllProjectClipsEnhanced() {
    var project = app.project;
    if (!project) {
        return JSON.stringify({ error: "No active project" });
    }

    var clips = [];
    collectClipsEnhanced(project.rootItem, clips);

    return JSON.stringify({
        clips: clips.map(function(item) {
            return enhanceClipMetadata(item);
        })
    });
}

function enhanceClipMetadata(item) {
    var metadata = {
        nodeId: item.nodeId,
        name: item.name,
        treePath: item.treePath || "",
        mediaPath: item.getMediaPath() || "",
        type: item.type,

        // Basic metadata
        tapeName: item.getProjectColumnsMetadata().Tape || "",
        description: item.getProjectColumnsMetadata().Description || "",
        shot: item.getProjectColumnsMetadata().Shot || "",

        // Determine if has structured metadata
        hasMetadata: false
    };

    // Check if has metadata (any field populated)
    if (metadata.tapeName || metadata.description || metadata.shot) {
        metadata.hasMetadata = true;
    }

    // Video properties (if available)
    try {
        if (item.type === ProjectItemType.CLIP) {
            var footage = item.getFootageInterpretation();
            metadata.frameRate = footage.frameRate || 0;
            metadata.duration = item.getOutPoint().seconds || 0;

            // Try to get resolution (may not be available for offline media)
            if (item.getSettings) {
                var settings = item.getSettings();
                metadata.width = settings.videoFrameWidth || 0;
                metadata.height = settings.videoFrameHeight || 0;
            }
        }
    } catch (e) {
        // Offline media or unavailable properties
        metadata.frameRate = 0;
        metadata.duration = 0;
        metadata.width = 0;
        metadata.height = 0;
    }

    // Proxy detection
    metadata.hasProxy = false;
    metadata.proxyPath = "";
    metadata.proxyAttached = false;

    try {
        // CRITICAL: Research needed - does PP API expose proxy info?
        // Possible properties to check:
        // - item.hasProxy (hypothetical)
        // - item.proxyMediaPath (hypothetical)
        // - item.getProxyPath() (hypothetical)

        // Fallback: Check if item has proxy via undocumented properties
        if (item.proxyMediaPath && item.proxyMediaPath !== "") {
            metadata.hasProxy = true;
            metadata.proxyPath = item.proxyMediaPath;
            metadata.proxyAttached = true;
        }
    } catch (e) {
        // Proxy API not available - use file system heuristics in JS
    }

    return metadata;
}

function collectClipsEnhanced(parentItem, clips) {
    // Add current item if it's a clip or file (not a bin)
    if (parentItem.type === ProjectItemType.CLIP ||
        parentItem.type === ProjectItemType.FILE) {
        clips.push(parentItem);
    }

    // Recurse into children
    if (parentItem.children && parentItem.children.numItems > 0) {
        for (var i = 0; i < parentItem.children.numItems; i++) {
            collectClipsEnhanced(parentItem.children[i], clips);
        }
    }
}
```

**Open Questions:**
- ❓ Does `ProjectItem` have proxy-related properties? (requires API research)
- ❓ Can we access codec name from ProjectItem? (may require parsing)
- ❓ What happens with offline media?

---

### 2. Get Clip By Node ID (getClipByNodeId)

**Purpose:** Fetch a single clip's enhanced metadata by nodeId.

**Function Signature:**
```javascript
function getClipByNodeId(nodeId)
```

**Parameters:**
- `nodeId` (string): Unique identifier for the clip

**Return Value:**
```json
{
  "clip": {
    "nodeId": "xyz123",
    "name": "kitchen-oven-cleaning-CU.mov",
    // ... all fields from getAllProjectClipsEnhanced ...
  }
}
```

**Implementation:**
```javascript
function getClipByNodeId(nodeId) {
    var project = app.project;
    if (!project) {
        return JSON.stringify({ error: "No active project" });
    }

    var item = findProjectItemByNodeId(project.rootItem, nodeId);
    if (!item) {
        return JSON.stringify({ error: "Clip not found" });
    }

    return JSON.stringify({
        clip: enhanceClipMetadata(item)
    });
}
```

---

### 3. Check Proxy Availability (checkProxyAvailable)

**Purpose:** Verify if a proxy file exists for a given clip.

**Function Signature:**
```javascript
function checkProxyAvailable(nodeId)
```

**Parameters:**
- `nodeId` (string): Unique identifier for the clip

**Return Value:**
```json
{
  "hasProxy": true,
  "proxyPath": "/Volumes/Media/Proxies/kitchen-oven-cleaning-CU_Proxy.mov",
  "proxyExists": true,
  "originalPath": "/Volumes/Media/RAW/kitchen-oven-cleaning-CU.mov"
}
```

**Implementation:**
```javascript
function checkProxyAvailable(nodeId) {
    var project = app.project;
    if (!project) {
        return JSON.stringify({ error: "No active project" });
    }

    var item = findProjectItemByNodeId(project.rootItem, nodeId);
    if (!item) {
        return JSON.stringify({ error: "Clip not found" });
    }

    var originalPath = item.getMediaPath();
    var hasProxy = false;
    var proxyPath = "";
    var proxyExists = false;

    try {
        // Check if PP has proxy attached
        if (item.proxyMediaPath && item.proxyMediaPath !== "") {
            hasProxy = true;
            proxyPath = item.proxyMediaPath;

            // Verify file exists
            var proxyFile = new File(proxyPath);
            proxyExists = proxyFile.exists;
        }
    } catch (e) {
        // API not available - return false
    }

    return JSON.stringify({
        hasProxy: hasProxy,
        proxyPath: proxyPath,
        proxyExists: proxyExists,
        originalPath: originalPath
    });
}
```

**Fallback Strategy (if PP API unavailable):**
```javascript
// In CEP JavaScript (not ExtendScript):
function guessProxyPath(originalPath) {
    // Strategy 1: Common naming convention
    var proxyPath = originalPath.replace(/\.([^.]+)$/, '_Proxy.$1');

    // Strategy 2: Check Proxies folder
    var dir = originalPath.substring(0, originalPath.lastIndexOf('/'));
    var filename = originalPath.substring(originalPath.lastIndexOf('/') + 1);
    var proxiesPath = dir + '/Proxies/' + filename;

    // Return both candidates for validation
    return [proxyPath, proxiesPath];
}
```

---

### 4. Get File Info (getFileInfo)

**Purpose:** Get detailed file information including codec and file size.

**Function Signature:**
```javascript
function getFileInfo(filePath)
```

**Parameters:**
- `filePath` (string): Absolute file path

**Return Value:**
```json
{
  "exists": true,
  "size": 524288000,
  "sizeFormatted": "500 MB",
  "created": "2025-11-01T10:30:00Z",
  "modified": "2025-11-01T10:30:00Z"
}
```

**Implementation:**
```javascript
function getFileInfo(filePath) {
    var file = new File(filePath);

    if (!file.exists) {
        return JSON.stringify({
            exists: false,
            error: "File not found: " + filePath
        });
    }

    var sizeBytes = file.length;
    var sizeFormatted = formatFileSize(sizeBytes);

    return JSON.stringify({
        exists: true,
        size: sizeBytes,
        sizeFormatted: sizeFormatted,
        created: file.created.toISOString(),
        modified: file.modified.toISOString()
    });
}

function formatFileSize(bytes) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var size = bytes;
    var unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return Math.round(size * 100) / 100 + ' ' + units[unitIndex];
}
```

---

### 5. Validate File Path (validateFilePath)

**Purpose:** Check if a file path is accessible and valid.

**Function Signature:**
```javascript
function validateFilePath(filePath)
```

**Parameters:**
- `filePath` (string): File path to validate

**Return Value:**
```json
{
  "valid": true,
  "exists": true,
  "readable": true,
  "type": "video",
  "extension": ".mov"
}
```

**Implementation:**
```javascript
function validateFilePath(filePath) {
    var file = new File(filePath);

    var result = {
        valid: false,
        exists: file.exists,
        readable: false,
        type: "unknown",
        extension: ""
    };

    if (!file.exists) {
        return JSON.stringify(result);
    }

    // Check if readable
    try {
        file.open('r');
        result.readable = true;
        file.close();
    } catch (e) {
        result.readable = false;
    }

    // Get extension
    var ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    result.extension = ext;

    // Determine type
    var videoExts = ['.mov', '.mp4', '.mxf', '.avi', '.r3d', '.prores'];
    var imageExts = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.dng', '.cr2'];

    if (videoExts.indexOf(ext) !== -1) {
        result.type = 'video';
    } else if (imageExts.indexOf(ext) !== -1) {
        result.type = 'image';
    }

    result.valid = result.exists && result.readable;

    return JSON.stringify(result);
}
```

---

## Updated EAVIngest Module Structure

```javascript
var EAVIngest = (function() {
    'use strict';

    // ========================================
    // EXISTING FUNCTIONS (from current host.jsx)
    // ========================================

    function getSelectedClips() { /* ... existing ... */ }
    function getAllProjectClips() { /* ... existing ... */ }
    function updateClipMetadata(nodeId, metadata) { /* ... existing ... */ }
    function selectClip(nodeId) { /* ... existing ... */ }
    function openInSourceMonitor(nodeId) { /* ... existing ... */ }
    function findProjectItemByNodeId(parentItem, nodeId) { /* ... existing ... */ }
    function collectClipsRecursive(parentItem, clips) { /* ... existing ... */ }

    // ========================================
    // NEW FUNCTIONS (for self-contained panel)
    // ========================================

    function getAllProjectClipsEnhanced() { /* ... see above ... */ }
    function enhanceClipMetadata(item) { /* ... see above ... */ }
    function collectClipsEnhanced(parentItem, clips) { /* ... see above ... */ }
    function getClipByNodeId(nodeId) { /* ... see above ... */ }
    function checkProxyAvailable(nodeId) { /* ... see above ... */ }
    function getFileInfo(filePath) { /* ... see above ... */ }
    function validateFilePath(filePath) { /* ... see above ... */ }
    function formatFileSize(bytes) { /* ... see above ... */ }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        // Existing
        getSelectedClips: getSelectedClips,
        getAllProjectClips: getAllProjectClips,
        updateClipMetadata: updateClipMetadata,
        selectClip: selectClip,
        openInSourceMonitor: openInSourceMonitor,

        // New
        getAllProjectClipsEnhanced: getAllProjectClipsEnhanced,
        getClipByNodeId: getClipByNodeId,
        checkProxyAvailable: checkProxyAvailable,
        getFileInfo: getFileInfo,
        validateFilePath: validateFilePath
    };
})();

// Make available to CEP panel
EAVIngest;
```

---

## Data Flow Diagrams

### Clip Loading with Proxy Detection

```
CEP Panel: ClipBrowser.loadAllClips()
    ↓
    evalScript('EAVIngest.getAllProjectClipsEnhanced()')
    ↓
ExtendScript: host.jsx
    ↓
    app.project.rootItem
    ↓
    collectClipsEnhanced() → Recursive tree traversal
    ↓
    For each clip:
      ├─ Get basic properties (name, path, nodeId)
      ├─ Get metadata (Tape, Description, Shot)
      ├─ Get video properties (frameRate, duration, resolution)
      └─ Check proxy status (hasProxy, proxyPath)
    ↓
    Return JSON array
    ↓
CEP Panel receives clips
    ↓
    PanelState.allClips = clips
    ↓
    ClipBrowser.render()
```

### Video Player File Loading

```
User selects clip in browser
    ↓
ClipBrowser fires 'clip-selected' event
    ↓
VideoPlayer.loadClip(clip)
    ↓
Check PanelState.proxyMode
    ├─ true → Use clip.proxyPath
    └─ false → Use clip.mediaPath
    ↓
If proxyPath empty and proxyMode true:
    evalScript('EAVIngest.checkProxyAvailable(nodeId)')
    ↓
    ExtendScript checks proxy
    ↓
    Return proxy path or fallback to original
    ↓
VideoPlayer.formatFileUrl(path)
    ├─ Normalize path (backslash → forward slash)
    ├─ Add file:// protocol
    └─ URL encode special chars
    ↓
videoElement.src = fileUrl
    ↓
videoElement.load()
    ↓
Monitor events:
    ├─ loadedmetadata → Display video info
    ├─ error → Show fallback UI
    └─ canplay → Ready for playback
```

---

## PP API Research Required

### Critical Questions

1. **Proxy Detection API**
   ```javascript
   // Does any of this exist in PP ExtendScript?
   item.hasProxy           // Boolean
   item.proxyMediaPath     // String
   item.isProxyAttached()  // Method
   item.attachProxy(path)  // Method
   item.toggleProxy()      // Method
   ```

2. **Codec Information**
   ```javascript
   // Can we get codec name?
   item.getCodec()         // Method?
   item.videoCodec         // Property?
   item.formatDescription  // Property?
   ```

3. **Resolution/Frame Rate**
   ```javascript
   // Current approach via getSettings() - is this reliable?
   var settings = item.getSettings();
   settings.videoFrameWidth    // Confirmed?
   settings.videoFrameHeight   // Confirmed?
   ```

### Research Methodology

1. **ExtendScript Toolkit Inspection**
   ```javascript
   // In ESTK, inspect ProjectItem properties:
   var item = app.project.getSelection()[0];
   for (var prop in item) {
       $.writeln(prop + ': ' + item[prop]);
   }
   ```

2. **PP Scripting Guide**
   - Review official Adobe Premiere Pro Scripting Guide
   - Check for proxy-related APIs
   - Document available properties

3. **Community Forums**
   - Check Adobe CEP forums for proxy detection patterns
   - Research existing extensions (e.g., EDL export tools)

---

## Error Handling Specification

### ExtendScript Error Responses

All functions must return consistent error format:

```json
{
  "error": "Error message here",
  "errorCode": "ERROR_CODE",
  "details": "Additional context"
}
```

**Error Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| `NO_PROJECT` | No active project | User closed project |
| `CLIP_NOT_FOUND` | NodeId not found | Clip deleted |
| `FILE_NOT_FOUND` | Media file missing | Offline media |
| `PERMISSION_DENIED` | File access denied | Security restriction |
| `API_UNAVAILABLE` | PP API not available | Version mismatch |
| `PARSE_ERROR` | JSON parsing failed | Malformed input |

### CEP Error Handling

```javascript
function safeEvalScript(script, callback, errorCallback) {
    csInterface.evalScript(script, function(result) {
        try {
            var data = JSON.parse(result);

            if (data.error) {
                console.error('[ExtendScript Error]', data);
                if (errorCallback) {
                    errorCallback(data);
                } else {
                    showStatus('PP Error: ' + data.error, 'error');
                }
                return;
            }

            callback(data);
        } catch (e) {
            console.error('[JSON Parse Error]', e, result);
            if (errorCallback) {
                errorCallback({ error: 'Parse error', details: e.message });
            } else {
                showStatus('Communication error', 'error');
            }
        }
    });
}
```

---

## Performance Considerations

### Large Project Optimization

For projects with 1000+ clips:

1. **Lazy Loading:**
   ```javascript
   // Load clips in batches
   function getAllProjectClipsEnhancedBatched(startIndex, batchSize) {
       var clips = [];
       collectClipsEnhanced(project.rootItem, clips);

       var batch = clips.slice(startIndex, startIndex + batchSize);
       return JSON.stringify({
           clips: batch.map(enhanceClipMetadata),
           totalCount: clips.length,
           hasMore: startIndex + batchSize < clips.length
       });
   }
   ```

2. **Minimal Metadata:**
   ```javascript
   // Option to load basic info only, fetch details on demand
   function getAllProjectClipsBasic() {
       // Return only: nodeId, name, treePath, type
       // Skip: frameRate, codec, proxy detection
   }
   ```

3. **Caching:**
   ```javascript
   // Cache enhanced metadata to avoid repeated ExtendScript calls
   var clipMetadataCache = {};

   function getCachedClipMetadata(nodeId) {
       if (clipMetadataCache[nodeId]) {
           return clipMetadataCache[nodeId];
       }

       var metadata = enhanceClipMetadata(item);
       clipMetadataCache[nodeId] = metadata;
       return metadata;
   }
   ```

---

## Testing Strategy

### Unit Tests (ExtendScript)

```javascript
// Test in ExtendScript Toolkit
function testEnhanceClipMetadata() {
    var project = app.project;
    var item = project.getSelection()[0];

    var metadata = enhanceClipMetadata(item);

    // Assertions
    if (!metadata.nodeId) $.writeln('FAIL: Missing nodeId');
    if (!metadata.name) $.writeln('FAIL: Missing name');
    if (!metadata.mediaPath) $.writeln('FAIL: Missing mediaPath');

    $.writeln('Test result: ' + JSON.stringify(metadata));
}
```

### Integration Tests (CEP)

```javascript
// Test from CEP panel console
function testGetAllClipsEnhanced() {
    csInterface.evalScript('EAVIngest.getAllProjectClipsEnhanced()', function(result) {
        var data = JSON.parse(result);
        console.log('Clips loaded:', data.clips.length);
        console.log('Sample clip:', data.clips[0]);

        // Validate structure
        if (!data.clips[0].hasProxy) {
            console.warn('Proxy detection may not be working');
        }
    });
}
```

---

## Migration Plan

### Backward Compatibility

Existing functions must continue to work for current implementation:

- `getSelectedClips()` - Keep for backward compatibility
- `getAllProjectClips()` - Keep simple version
- New `getAllProjectClipsEnhanced()` - Extended version

### Deprecation Strategy

1. Phase 1: Add new functions alongside old
2. Phase 2: Migrate panel to use new functions
3. Phase 3: Mark old functions as deprecated (comments only)
4. Phase 4: Remove old functions in v2.0

---

## Next Steps

1. ✅ **Create this specification** (complete)
2. 🔄 **Research PP API** for proxy detection
3. 🔄 **Prototype ExtendScript functions** in ESTK
4. 🔄 **Validate file:// URL approach** in CEP
5. 🔄 **Test with ProRes files** on macOS/Windows
6. 🔄 **Document findings** and update spec

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Next Review:** After PP API research completion
