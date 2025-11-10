# Architecture Summary - Self-Contained CEP Panel

**Document Version:** 1.0
**Date:** 2025-11-10
**Status:** Design Complete - Ready for Prototype Phase

---

## Quick Reference

### What Changed?

| Current (v1.0) | New (v2.0) |
|----------------|------------|
| Selection-based (relies on PP Project Panel) | Self-contained (internal clip browser) |
| No video preview (uses PP Source Monitor) | HTML5 video player embedded |
| Polling for selection changes (2s interval) | Event-driven architecture |
| Single-column layout | 3-panel layout (browser \| player \| form) |
| No proxy support | Proxy-first with toggle |
| Simple metadata only | Enhanced metadata + video info |

### Why This Change?

**Problem:** PP Project Panel selection is unreliable in PP 2025
**Solution:** Make panel fully self-contained with internal navigation
**Benefit:** Users can browse, preview, and edit metadata in one place

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│  EAV Ingest Assistant - Self-Contained Panel               │
├──────────────┬────────────────────────┬─────────────────────┤
│ ClipBrowser  │    VideoPlayer         │   MetadataForm      │
│              │                        │                     │
│ • Search     │ • HTML5 <video>        │ • ID (readonly)     │
│ • Filter     │ • Proxy/Raw toggle     │ • Location          │
│ • List all   │ • file:// URLs         │ • Subject           │
│   clips      │ • ProRes support       │ • Action            │
│ • Select →   │                        │ • Shot Type         │
│   triggers   │ [Playback controls]    │ • Metadata          │
│   load       │                        │                     │
│              │                        │ [Apply] [AI]        │
│              │                        │ [Prev] [Next]       │
└──────────────┴────────────────────────┴─────────────────────┘
       ↓               ↓                        ↓
   PanelState (Global State + Event System)
       ↓
   ExtendScript Bridge (host.jsx)
       ↓
   Premiere Pro API
```

---

## Key Design Decisions

### 1. Self-Contained vs Selection-Based

**Decision:** Self-contained panel with internal clip browser
**Rationale:** PP Project Panel selection is unreliable
**Trade-off:** More complex UI, but better UX

See: [ADR-002](ADR-002-SELF-CONTAINED-PANEL-ARCHITECTURE.md)

### 2. HTML5 Video Player

**Decision:** Use HTML5 `<video>` element with file:// URLs
**Rationale:**
- CEP supports HTML5 video
- file:// protocol works in CEP context
- ProRes support via OS codecs (macOS native, Windows requires install)

**Fallback:** If codec unsupported, show "Open in Source Monitor" button

### 3. Proxy-First Workflow

**Decision:** Load proxies first, provide toggle to original
**Rationale:**
- Proxies load faster (smaller file size)
- Better performance for large ProRes files
- Matches PP's native proxy workflow

**Implementation:**
```javascript
// Proxy loading priority:
1. Check if proxy attached in PP → load proxy
2. If proxy missing → load original
3. User can toggle: Proxy [ON] [OFF]
```

### 4. Event-Driven Architecture

**Decision:** Components communicate via custom DOM events
**Rationale:**
- Decouples components
- No more polling (removes 2s interval overhead)
- Easier to maintain and extend

**Events:**
- `clip-selected` - Fired when user selects clip
- `metadata-applied` - Fired when metadata saved
- `proxy-toggled` - Fired when proxy mode changes

---

## Component Specifications

### ClipBrowser (Left Panel)

**Responsibilities:**
- Fetch all project clips via ExtendScript
- Display searchable/filterable list
- Handle clip selection
- Show metadata status icons

**Key Functions:**
- `loadAllClips()` - Fetch from PP
- `render()` - Display filtered clips
- `selectClip(nodeId)` - Handle selection

See: [COMPONENT-ARCHITECTURE.md § ClipBrowser](COMPONENT-ARCHITECTURE.md#component-1-clipbrowser)

---

### VideoPlayer (Center Panel)

**Responsibilities:**
- Load video files via file:// URLs
- Display HTML5 video player
- Implement proxy/raw toggle
- Show video info (codec, resolution, duration)
- Handle playback errors with fallback UI

**Key Functions:**
- `loadClip(clip)` - Load video source
- `getProxyPath(clip)` - Detect proxy path
- `formatFileUrl(path)` - Convert to file:// URL
- `toggleProxy(mode)` - Switch proxy/raw

See: [COMPONENT-ARCHITECTURE.md § VideoPlayer](COMPONENT-ARCHITECTURE.md#component-2-videoplayer)

---

### MetadataForm (Right Panel)

**Responsibilities:**
- Load clip metadata on selection
- Display form fields (location, subject, action, shot type)
- Generate structured naming preview
- Apply metadata to PP project
- Navigate previous/next clips

**Changes from v1.0:**
- ❌ Remove polling (no longer needed)
- ✅ Listen to `clip-selected` event
- ✅ Navigate via ClipBrowser state (not PP API)

See: [COMPONENT-ARCHITECTURE.md § MetadataForm](COMPONENT-ARCHITECTURE.md#component-3-metadataform-refactored)

---

## ExtendScript API Extensions

### New Functions Required

| Function | Purpose | Priority |
|----------|---------|----------|
| `getAllProjectClipsEnhanced()` | Get all clips with proxy + video info | **HIGH** |
| `getClipByNodeId(nodeId)` | Get single clip metadata | Medium |
| `checkProxyAvailable(nodeId)` | Check if proxy exists | **HIGH** |
| `getFileInfo(filePath)` | Get file size, codec info | Low |
| `validateFilePath(filePath)` | Check file accessibility | Low |

### Enhanced Clip Metadata

```json
{
  "nodeId": "xyz123",
  "name": "kitchen-oven-cleaning-CU.mov",
  "mediaPath": "/Volumes/Media/RAW/kitchen-oven.mov",

  // NEW: Proxy info
  "hasProxy": true,
  "proxyPath": "/Volumes/Media/Proxies/kitchen-oven_Proxy.mov",

  // NEW: Video properties
  "width": 1920,
  "height": 1080,
  "frameRate": 23.976,
  "duration": 15.5,
  "codec": "Apple ProRes 422",

  // NEW: Metadata status
  "hasMetadata": true
}
```

See: [EXTENDSCRIPT-API-SPEC.md](EXTENDSCRIPT-API-SPEC.md)

---

## Implementation Roadmap

### Phase 1: Prototype & Validation (Week 1)
**Goal:** Validate technical assumptions

**Critical Questions:**
1. ✅ Can HTML5 video play ProRes via file:// URLs?
2. ✅ Does PP API expose proxy paths?
3. ✅ What's the performance for 1000+ clip projects?

**Deliverables:**
- Video player prototype
- PP API proxy research
- Performance benchmarks

**Decision Point:** Go/No-Go for Phase 2

---

### Phase 2: Component Development (Weeks 2-3)
**Goal:** Build core functionality

**Week 2:**
- ClipBrowser component
- VideoPlayer component
- MetadataForm refactor

**Week 3:**
- State management integration
- ExtendScript API extensions
- UI/UX polish

**Deliverables:**
- All 3 components functional
- ExtendScript API extended
- 3-panel layout complete

---

### Phase 3: Integration & Polish (Week 4)
**Goal:** Production-ready extension

**Tasks:**
- Error handling & edge cases
- Cross-platform testing (macOS + Windows)
- Performance optimization
- Documentation

**Deliverables:**
- Extension production-ready
- Cross-platform tested
- Documentation complete

---

### Phase 4: Deployment (3 Days)
**Goal:** Release to users

**Tasks:**
- Package extension
- User testing & feedback
- Release

**Deliverables:**
- Extension released
- Users onboarded
- Support materials ready

**Total Time:** 4 weeks + 3 days

See: [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md)

---

## Critical Technical Risks

### Risk #1: ProRes Playback in HTML5

**Risk:** ProRes codec not supported in CEP browser engine
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Early prototype to validate
- Fallback: Thumbnail + "Open in Source Monitor" button
- Document codec installation for Windows users

**Validation:** Phase 1, Day 1-2

---

### Risk #2: PP API Proxy Detection

**Risk:** PP ExtendScript API doesn't expose proxy paths
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Research PP API thoroughly (Phase 1, Day 3-4)
- Fallback: File system heuristics (naming conventions)
- User configuration for custom proxy folder mapping

**Validation:** Phase 1, Day 3-4

---

### Risk #3: Performance with Large Projects

**Risk:** Panel becomes unresponsive with 1000+ clips
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Virtual scrolling for clip list
- Lazy loading (batch load clips)
- Clip metadata caching

**Validation:** Phase 1, Day 5

---

### Risk #4: CEP file:// Protocol Restrictions

**Risk:** CEP security blocks file:// URLs
**Probability:** Low
**Impact:** High
**Mitigation:**
- Early prototype to validate (Phase 1, Day 1)
- Research CEP security exceptions
- Alternative: Custom file serving via localhost

**Validation:** Phase 1, Day 1

---

## State Management

### Global Panel State

```javascript
var PanelState = {
  // Clip data
  allClips: [],              // All project clips
  currentClip: null,         // Selected clip
  currentClipIndex: -1,      // Index in array

  // Display mode
  proxyMode: true,           // Proxy vs original

  // UI state
  searchFilter: '',          // Search text
  isLoading: false,          // Loading state

  // Form data
  formData: { /* ... */ }
};
```

### Event System

```javascript
// Components communicate via events:

// Clip selection
document.dispatchEvent(new CustomEvent('clip-selected', {
  detail: clip
}));

// Metadata saved
document.dispatchEvent(new CustomEvent('metadata-applied', {
  detail: { nodeId, success }
}));

// Proxy toggled
document.dispatchEvent(new CustomEvent('proxy-toggled', {
  detail: { proxyMode }
}));
```

---

## File Structure

```
eav-cep-assist/
├── docs/
│   ├── ADR-002-SELF-CONTAINED-PANEL-ARCHITECTURE.md
│   ├── COMPONENT-ARCHITECTURE.md
│   ├── EXTENDSCRIPT-API-SPEC.md
│   ├── IMPLEMENTATION-ROADMAP.md
│   └── ARCHITECTURE-SUMMARY.md (this file)
│
├── CSXS/
│   └── manifest.xml (update for v2.0)
│
├── jsx/
│   └── host.jsx (extend with new functions)
│
├── js/
│   ├── components/ (new)
│   │   ├── ClipBrowser.js
│   │   ├── VideoPlayer.js
│   │   └── MetadataForm.js
│   ├── PanelState.js
│   ├── EventBus.js
│   ├── CSInterface.js (existing)
│   └── main.js (refactored)
│
├── css/
│   ├── clip-browser.css
│   ├── video-player.css
│   └── style.css (refactored for 3-panel)
│
└── index.html (refactored for 3-panel layout)
```

---

## Technical Stack

### CEP Panel (HTML5/CSS/JS)
- **HTML5 Video** - `<video>` element for playback
- **Vanilla JavaScript** - No framework (minimal overhead)
- **CSS Grid** - 3-panel layout
- **Custom Events** - Inter-component communication
- **Adobe CSInterface** - CEP communication library

### ExtendScript (PP Bridge)
- **PP Scripting API** - ProjectItem, metadata access
- **JSON Serialization** - Data transfer to CEP
- **File System API** - File validation, proxy detection
- **Error Handling** - Consistent error response format

### Premiere Pro API
- **ProjectItem** - Clip metadata access
- **Project Panel** - Clip collection
- **Source Monitor** - Fallback playback
- **Metadata Columns** - Tape, Description, Shot fields

---

## Codec Support Matrix

| OS | ProRes Native? | Required Install | Status |
|----|----------------|------------------|--------|
| **macOS** | ✅ Yes | None | Full support |
| **Windows** | ❌ No | QuickTime / ProRes codec pack | Requires install |

**Fallback Strategy:**
- If codec unsupported → Show error message
- Provide "Open in Source Monitor" button
- Display codec installation guide

---

## Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Load all clips (1000 clips) | <5s | <10s |
| Render clip list | <500ms | <1s |
| Video switching latency | <1s | <2s |
| Search/filter response | <100ms | <300ms |
| Memory usage | <200MB | <500MB |

---

## Success Criteria

### Phase 1 (Prototype)
- [ ] ProRes playback working in CEP video element
- [ ] file:// URLs functional
- [ ] Proxy detection viable (API or fallback)
- [ ] Performance acceptable for target project sizes

### Phase 2-3 (Development)
- [ ] All 3 components functional
- [ ] State management working
- [ ] ExtendScript API extended
- [ ] Cross-platform tested (macOS + Windows)
- [ ] No critical bugs

### Phase 4 (Deployment)
- [ ] Extension installed successfully by users
- [ ] User feedback positive (>80% satisfaction)
- [ ] Support tickets minimal (<5 in first week)

---

## Next Steps

### Immediate (This Week)
1. **Review architectural documents** with stakeholders
2. **Begin Phase 1 prototype** - Video player validation
3. **Research PP API** - Proxy detection capabilities
4. **Set up development environment** - CEP debugging tools

### Short-term (Next 2 Weeks)
1. Complete Phase 1 validation
2. Go/No-Go decision
3. Begin Phase 2 component development

### Long-term (1-2 Months)
1. Complete Phases 2-3 development
2. Cross-platform testing
3. Phase 4 deployment
4. Plan Phase 2 (AI integration)

---

## Related Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [ADR-002](ADR-002-SELF-CONTAINED-PANEL-ARCHITECTURE.md) | Architectural decision record | Technical team |
| [COMPONENT-ARCHITECTURE](COMPONENT-ARCHITECTURE.md) | Component specifications | Developers |
| [EXTENDSCRIPT-API-SPEC](EXTENDSCRIPT-API-SPEC.md) | ExtendScript API reference | Developers |
| [IMPLEMENTATION-ROADMAP](IMPLEMENTATION-ROADMAP.md) | Project plan & timeline | Project managers |
| [ARCHITECTURE-SUMMARY](ARCHITECTURE-SUMMARY.md) | Quick reference | All stakeholders |

---

## Questions or Concerns?

### Technical Questions
- ExtendScript API capabilities
- CEP browser limitations
- ProRes codec support

### Implementation Questions
- Development timeline
- Resource allocation
- Testing strategy

### User Questions
- Installation process
- Workflow changes
- Training materials

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Design Complete - Awaiting Phase 1 Prototype
**Next Review:** After Phase 1 completion
