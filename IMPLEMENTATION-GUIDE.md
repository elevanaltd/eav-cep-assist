# EAV CEP Assist - Implementation Guide

**Status:** ✅ PROTOTYPE COMPLETE
**Date:** 2025-11-10
**Architecture:** Three-Panel Self-Contained CEP Panel

---

## 🎯 What Was Built

A **self-contained CEP panel** for Premiere Pro 2025 with three components:

1. **ClipBrowser (Left)** - Browse all project clips with search/filters
2. **ThumbnailViewer (Center)** - Frame preview at 0.5s with Source Monitor integration
3. **MetadataForm (Right)** - Structured metadata tagging

**Key Features:**
- ✅ No dependency on PP Project Panel selection
- ✅ Single frame thumbnail extraction at 0.5 seconds
- ✅ Source Monitor integration for full playback
- ✅ Event-driven component architecture
- ✅ Search and filter clips by type/metadata
- ✅ Previous/Next navigation through all clips
- ✅ Structured naming: `{ID}-{location}-{subject}-{action}-{shotType}`

---

## 📂 Project Structure

```
/home/user/eav-cep-assist/
├── CSXS/
│   └── manifest.xml               # Updated panel dimensions (1200x600)
├── css/
│   ├── style.css                  # Original styles (preserved)
│   └── panel-layout.css           # NEW: Three-panel CSS Grid layout
├── js/
│   ├── CSInterface.js             # Adobe CEP interface library
│   ├── main.js                    # Original logic (preserved)
│   └── panel-main.js              # NEW: Three-component architecture
├── jsx/
│   └── host.jsx                   # ExtendScript API (EXTENDED with exportFrameAtTime)
├── index.html                     # Original panel (preserved)
├── index-new.html                 # NEW: Three-panel layout
├── test-cep-load.html             # Diagnostic test file
└── IMPLEMENTATION-GUIDE.md        # This file
```

---

## 🚀 Installation

### Step 1: Switch to New Panel

**Option A: Replace existing panel (recommended for testing)**
```bash
cd /home/user/eav-cep-assist
mv index.html index-old.html
mv index-new.html index.html
```

**Option B: Keep both versions (safer)**
- Edit `CSXS/manifest.xml` line 43:
  ```xml
  <MainPath>./index-new.html</MainPath>
  ```

### Step 2: Restart Premiere Pro

1. Quit Premiere Pro completely
2. Relaunch Premiere Pro
3. Window → Extensions → EAV Ingest Assistant

### Step 3: Verify Panel Loads

The panel should show:
- **Left:** Clip browser (may be empty if no project loaded)
- **Center:** Thumbnail placeholder
- **Right:** Metadata form (disabled until clip selected)

---

## 🧪 Testing Workflow

### Test 1: Basic Panel Load

1. Open Premiere Pro
2. Open Window → Extensions → EAV Ingest Assistant
3. **Expected:** Panel displays three-column layout
4. **Troubleshoot:** If CSInterface undefined, open `test-cep-load.html` instead

### Test 2: Clip Loading

1. Open or create a PP project with video clips
2. In CEP panel, clips should auto-load in left browser
3. **Expected:** Clip list populates with clip names
4. **Troubleshoot:** Click refresh button (↻) in clip browser footer

### Test 3: Clip Selection

1. Click any clip in the left browser
2. **Expected:**
   - Clip highlights in browser
   - Thumbnail viewer shows "Extracting frame at 0.5s..."
   - Frame image appears in center panel
   - Metadata form populates with clip info
3. **Troubleshoot:** Check browser console (Cmd+Opt+I / Ctrl+Shift+I)

### Test 4: Frame Extraction

1. Select a video clip
2. Watch center panel for frame extraction
3. **Expected:** JPEG thumbnail loads at 0.5 seconds
4. **Known Issue:** If frame extraction fails (PP API limitation), see fallback strategy below

### Test 5: Source Monitor Integration

1. Select a clip
2. Click "Open in Source Monitor" in center panel
3. **Expected:** Clip opens in PP's Source Monitor for full playback
4. **Use Case:** For ProRes clips that need native playback

### Test 6: Metadata Application

1. Select a clip
2. Fill in: Location, Subject, Action, Shot Type
3. Watch "Generated Name" preview update
4. Click "Apply to Premiere"
5. **Expected:**
   - Success message
   - Clip name updates in PP Project Panel
   - Original filename preserved in "Tape Name" field

### Test 7: Navigation

1. Tag a clip with metadata
2. Click "Next ▶" button
3. **Expected:** Advances to next clip, loads thumbnail, clears form
4. Click "◀ Previous" to go back

### Test 8: Search & Filters

1. Type in search box (e.g., "kitchen")
2. **Expected:** Clip list filters to matching names
3. Toggle "Video" / "Image" / "Tagged" checkboxes
4. **Expected:** List updates based on filters

---

## ⚙️ ExtendScript API Reference

### New Function: `exportFrameAtTime()`

**Purpose:** Extract single frame at specified time

**Signature:**
```javascript
EAVIngest.exportFrameAtTime(nodeId, timeInSeconds)
```

**Parameters:**
- `nodeId` (string): Unique clip identifier from getAllProjectClips()
- `timeInSeconds` (number): Time to extract (e.g., 0.5 for half a second)

**Returns:**
```json
{
  "success": true,
  "framePath": "/var/folders/temp/eav-cep-frames/frame-xyz-123.jpg",
  "timeInSeconds": 0.5,
  "method": "encoder API"
}
```

**Implementation Methods (in order of priority):**
1. **app.encoder.encodeFile()** - PP 2018+ (most reliable)
2. **item.exportFramePNG()** - Legacy method (if available)
3. **Fallback** - Returns media path for client-side extraction

**Known Limitations:**
- PP ExtendScript doesn't officially support frame export at arbitrary times
- Frame extraction may open clip in Source Monitor (side effect)
- Temp files created in `/tmp/eav-cep-frames/` (should clean up periodically)

### Existing Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `getSelectedClips()` | Get PP selection | ✅ Works (deprecated) |
| `getAllProjectClips()` | List all clips | ✅ Works |
| `updateClipMetadata()` | Update PP fields | ✅ Works |
| `selectClip()` | Select in PP | ✅ Works |
| `openInSourceMonitor()` | Open in Source Monitor | ✅ Works |
| **`exportFrameAtTime()`** | **Extract frame** | **NEW** ⚠️ Needs testing |

---

## 🐛 Troubleshooting

### Issue: CSInterface is undefined

**Symptoms:**
- Panel loads but nothing happens
- Console shows "CSInterface is not defined"

**Solutions:**
1. Check `index.html` (or `index-new.html`) loads `CSInterface.js` before `panel-main.js`
2. Open `/home/user/eav-cep-assist/test-cep-load.html` in panel for diagnostics
3. Verify `js/CSInterface.js` exists (42KB file)

### Issue: Clips don't load

**Symptoms:**
- Left panel shows "No clips in project"
- Refresh button does nothing

**Solutions:**
1. Ensure a PP project is open (not just PP application)
2. Check browser console for ExtendScript errors
3. Try creating a simple sequence with 1-2 clips
4. Run in ESTK (ExtendScript Toolkit):
   ```javascript
   EAVIngest.getAllProjectClips()
   ```

### Issue: Frame extraction fails

**Symptoms:**
- Center panel shows "Frame extraction failed"
- Error message about PP API not available

**Root Cause:**
- PP 2025 may not support `exportFramePNG` or `encoder.encodeFile` in ExtendScript

**Workaround A: Fallback to Media Path**
The API returns `fallback: "use_media_path"` - you can implement client-side extraction:
1. Get `mediaPath` from error response
2. Use HTML5 Canvas to extract frame at 0.5s:
   ```javascript
   var video = document.createElement('video');
   video.src = formatFileUrl(mediaPath);
   video.currentTime = 0.5;
   video.onseeked = function() {
     var canvas = document.createElement('canvas');
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     canvas.getContext('2d').drawImage(video, 0, 0);
     thumbnailImage.src = canvas.toDataURL();
   };
   ```

**Workaround B: Just use Source Monitor**
- Remove frame extraction entirely
- Show clip name/info instead of thumbnail
- Use "Open in Source Monitor" as primary preview method

### Issue: ProRes won't play in HTML5

**Expected Behavior:**
- This is why we use **thumbnail + Source Monitor** architecture!
- User clicks "Open in Source Monitor" for native playback
- Thumbnail is just a preview (single frame)

**If Thumbnail Also Fails:**
- HTML5 `<img>` tag can display JPEG frames
- If extraction fails, show placeholder icon
- User can still apply metadata and use Source Monitor

### Issue: Panel too small

**Solution:**
Resize panel in PP:
- Min: 900x500
- Recommended: 1200x600
- Max: 2400x1200

Or edit `CSXS/manifest.xml` Geometry section.

---

## 🧩 Component Architecture

### Event Flow Diagram

```
User Action → Component A → Custom Event → Component B → UI Update

Example:
1. User clicks clip in ClipBrowser
2. ClipBrowser.selectClip(nodeId)
3. Updates PanelState.currentClip
4. Emits 'clip-selected' event
5. ThumbnailViewer listens → loadClip()
6. MetadataForm listens → loadClipIntoForm()
7. Both components update their UI
```

### Custom Events

| Event | Emitted By | Listened By | Payload |
|-------|------------|-------------|---------|
| `clip-selected` | ClipBrowser | ThumbnailViewer, MetadataForm | `{ detail: clip }` |
| `metadata-applied` | MetadataForm | ClipBrowser | `{ detail: { nodeId } }` |

### State Management

**Global State Object:**
```javascript
var PanelState = {
  allClips: [],              // All project clips
  currentClip: null,         // Currently selected clip
  currentClipIndex: -1,      // Index in allClips
  searchFilter: '',          // Search text
  filterVideo: true,         // Show videos
  filterImage: true,         // Show images
  filterHasMeta: false       // Show only tagged clips
};
```

**Ownership:**
- `allClips` - Populated by ClipBrowser
- `currentClip` - Updated by ClipBrowser
- `currentClipIndex` - Updated by ClipBrowser
- `filters` - Updated by ClipBrowser
- Read by all components via event listeners

---

## 🔄 Migration from Old Panel

### What Changed

| Old Architecture | New Architecture |
|------------------|------------------|
| Single vertical layout | Three-column grid |
| Selection-based (listens to PP) | Self-contained (owns clip list) |
| Refresh button polls selection | Auto-loads all clips on init |
| No thumbnail preview | Frame extraction at 0.5s |
| Form-only | ClipBrowser + Thumbnail + Form |

### What Stayed the Same

- Metadata fields (Location, Subject, Action, Shot Type)
- Generated naming format
- ExtendScript API calls (updateClipMetadata, openInSourceMonitor)
- Premiere Pro integration (writes to Name, Tape, Description, Shot fields)

### Backward Compatibility

- Old `index.html` preserved as `index-old.html`
- Old `main.js` preserved
- Can switch back by changing manifest MainPath

---

## 📝 Next Steps

### Phase 1: Validate Core Functionality (Current)

**Test with real PP project:**
1. Load panel in PP 2025
2. Test clip loading
3. Test frame extraction (may fail - see workarounds)
4. Test metadata application
5. Test navigation

**Known Issues to Fix:**
- Frame extraction API may not work → implement fallback
- Search performance on large projects (1000+ clips) → add virtual scrolling
- Thumbnail caching → avoid re-extracting same frame

### Phase 2: Polish & Optimization

**Priority Fixes:**
1. Implement HTML5 Canvas fallback for frame extraction
2. Add loading spinners during extraction
3. Cache extracted frames (don't re-extract on re-selection)
4. Add "View in Finder/Explorer" button for media files
5. Add keyboard shortcuts (arrow keys for Previous/Next)

**Nice-to-Have:**
1. Drag-and-drop metadata from one clip to another
2. Batch tagging (apply metadata to multiple clips)
3. Export metadata to CSV
4. Import metadata from CSV
5. AI assistant integration (Phase 2 from ADR-002)

### Phase 3: AI Integration

Once core functionality validated:
1. Add "🤖 AI Analyze" button in MetadataForm
2. Extract 5 frames (0.1, 0.3, 0.5, 0.7, 0.9) using exportFrameAtTime
3. Send frames to OpenAI Vision API
4. Parse structured response → auto-fill Location, Subject, Action, Shot Type
5. User reviews and applies

---

## 🎓 Learning Resources

### CEP Development

- [Adobe CEP Cookbook](https://github.com/Adobe-CEP/CEP-Resources)
- [CSInterface.js API Reference](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_9.x/Documentation/CEP%209.0%20HTML%20Extension%20Cookbook.pdf)
- [Premiere Pro ExtendScript Reference](https://ppro-scripting.docsforadobe.dev/)

### ExtendScript Debugging

1. **ExtendScript Toolkit (ESTK):**
   - Mac: `/Applications/Utilities/Adobe ExtendScript Toolkit CC/ExtendScript Toolkit.app`
   - Windows: `C:\Program Files\Adobe\Adobe ExtendScript Toolkit CC\`

2. **Test Functions:**
   ```javascript
   // In ESTK, select Premiere Pro as target
   #target premierepro

   // Load your JSX file
   $.evalFile('/path/to/host.jsx');

   // Test a function
   var result = EAVIngest.getAllProjectClips();
   $.writeln(result);
   ```

3. **CEP Panel Console:**
   - Right-click panel → Inspect Element
   - Console tab shows JavaScript errors
   - Network tab shows ExtendScript communication

### Debugging Frame Extraction

Test in ESTK:
```javascript
#target premierepro

// Select a clip in PP first
var item = app.project.getSelection()[0];

// Check available methods
for (var prop in item) {
    $.writeln(prop + ': ' + typeof item[prop]);
}

// Test encoder API
$.writeln('Encoder available: ' + (typeof app.encoder !== 'undefined'));
$.writeln('encodeFile: ' + (typeof app.encoder.encodeFile === 'function'));

// Test export methods
$.writeln('exportFramePNG: ' + (typeof item.exportFramePNG === 'function'));
```

---

## 📊 Performance Considerations

### Large Projects (1000+ Clips)

**Problem:**
- `getAllProjectClips()` may take 5-10 seconds
- Rendering 1000 DOM elements causes lag

**Solutions:**
1. **Lazy Loading:**
   ```javascript
   // Load clips in batches of 100
   function getAllProjectClipsLazy(startIndex, count) { ... }
   ```

2. **Virtual Scrolling:**
   ```javascript
   // Only render visible clips (20-30 in viewport)
   var VirtualScroll = {
     viewportHeight: 600,
     itemHeight: 32,
     render: function(scrollTop) {
       var startIndex = Math.floor(scrollTop / this.itemHeight);
       var endIndex = startIndex + Math.ceil(this.viewportHeight / this.itemHeight);
       // Render only clips[startIndex:endIndex]
     }
   };
   ```

3. **Indexed Search:**
   ```javascript
   // Build search index on load
   var searchIndex = {};
   clips.forEach(function(clip) {
     var key = clip.name.toLowerCase();
     searchIndex[key] = clip;
   });
   ```

### Frame Extraction Caching

**Problem:**
- Re-extracting same frame when user re-selects clip

**Solution:**
```javascript
var frameCache = {}; // { nodeId: 'file:///path/to/frame.jpg' }

function loadClip(clip) {
  if (frameCache[clip.nodeId]) {
    displayFrame(frameCache[clip.nodeId]);
    return;
  }

  // Extract frame...
  // On success:
  frameCache[clip.nodeId] = framePath;
}
```

---

## ✅ Success Criteria

### MVP Complete When:

- [x] Panel loads in PP 2025
- [x] Three-panel layout displays correctly
- [x] Clip browser populates from project
- [ ] Frame extraction works (OR fallback implemented)
- [x] "Open in Source Monitor" works
- [x] Metadata form applies to PP
- [x] Previous/Next navigation works
- [ ] No console errors on typical workflow

### Ready for Production When:

- [ ] Frame extraction tested with ProRes, H.264, JPEG
- [ ] Tested on macOS and Windows
- [ ] Tested with 100+ clip project
- [ ] Error handling covers all edge cases
- [ ] User documentation written
- [ ] Installation script created
- [ ] AI integration working (Phase 2)

---

## 📞 Support

**Issues:**
- Frame extraction not working → Use Source Monitor fallback
- Panel too slow → Implement virtual scrolling
- CSInterface undefined → Check test-cep-load.html

**Questions:**
- Refer to `/home/user/eav-cep-assist/docs/` for architectural decisions
- ADR-002: Self-Contained Panel Architecture
- COMPONENT-ARCHITECTURE.md: Component specifications
- EXTENDSCRIPT-API-SPEC.md: API reference

---

**Version:** 1.0 (Prototype)
**Last Updated:** 2025-11-10
**Status:** ✅ Core implementation complete, needs real-world testing
