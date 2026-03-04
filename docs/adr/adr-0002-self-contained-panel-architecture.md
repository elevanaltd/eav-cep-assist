# ADR-002: Self-Contained Panel Architecture with Video Player

**Status:** Proposed
**Date:** 2025-11-10
**Supersedes:** ADR-001 (Selection-based architecture)
**Decision Makers:** Technical Architect

---

## Context

The current CEP panel implementation (ADR-001) uses a **selection-based architecture** where the user must:
1. Select a clip in PP's Project Panel
2. Panel reacts to selection and loads metadata

**Critical Problem:** This workflow is broken and unreliable in Premiere Pro 2025.

**User Request:**
> "All-in-one panel with clip browser (left), video player (center), and metadata form (right). Load proxies FIRST, raw files secondary. Toggle button to switch proxy/raw like PP's native toggle."

**Technical Context:**
- Primary codec: Apple ProRes 422
- Workflow: Offline-first (no network dependency)
- Environment: CEP panel (HTML5/CSS/JS + ExtendScript bridge)
- Target: PP 2025 (CSXS 12.0)
- Reference: `/home/user/ingest-assistant` Electron app with video player

---

## Decision

We will implement a **self-contained 3-panel layout** within a single CEP extension:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  EAV Ingest Assistant - Self-Contained Panel                   │
├──────────────┬──────────────────────────┬──────────────────────┤
│              │                          │                      │
│ ClipBrowser  │    VideoPlayer           │   MetadataForm       │
│ (Left)       │    (Center)              │   (Right)            │
│              │                          │                      │
│ • List all   │ • HTML5 <video>          │ • ID (read-only)     │
│   project    │ • Proxy-first loading    │ • Location           │
│   clips      │ • Toggle: Proxy/Raw      │ • Subject            │
│ • Search     │ • file:// protocol       │ • Action             │
│ • Filter     │ • ProRes 422 support     │ • Shot Type          │
│ • Select →   │                          │ • Metadata tags      │
│   load clip  │ [Playback controls]      │                      │
│              │                          │ [Apply] [AI Assist]  │
│              │                          │ [Prev] [Next]        │
└──────────────┴──────────────────────────┴──────────────────────┘
```

### Key Architectural Decisions

#### 1. Self-Contained vs Selection-Based

**Decision:** Self-contained panel with internal clip browser
**Rationale:**
- **Problem**: Selection-based approach unreliable in PP 2025
- **Solution**: Panel owns clip navigation logic
- **Benefit**: User can browse/preview all clips without PP Project Panel
- **Trade-off**: More complex UI, but better UX

#### 2. Video Player Technology

**Decision:** HTML5 `<video>` element with file:// URLs
**Alternatives Considered:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **HTML5 `<video>`** | ✅ Native browser support<br>✅ CEP compatible<br>✅ ProRes support (OS-dependent)<br>✅ file:// protocol works | ⚠️ Codec dependency<br>⚠️ Limited format support | **SELECTED** |
| Custom Canvas renderer | Full control | Massive complexity, poor performance | Rejected |
| External player integration | Professional codecs | Security/sandboxing issues | Rejected |
| PP Source Monitor API | Native PP player | No programmatic control in CEP | Not available |

**Rationale:**
- CEP browser context supports HTML5 `<video>` element
- file:// protocol works in CEP (unlike web browsers)
- Electron reference (`/home/user/ingest-assistant`) proves pattern works
- ProRes 422 playback depends on OS codec availability:
  - **macOS**: Native ProRes support ✅
  - **Windows**: Requires QuickTime/ProRes codec pack ⚠️

#### 3. Proxy Workflow Strategy

**Decision:** Proxy-first with intelligent fallback
**Implementation Strategy:**

```javascript
// Proxy loading priority:
// 1. Check if proxy attached in PP project (via API)
// 2. If proxy exists → load proxy path
// 3. If proxy missing/toggle off → load original path
// 4. Display toggle button to switch modes

Workflow:
  User selects clip
    ↓
  Check proxy status via PP API
    ↓
  Load proxy file:// URL (if available)
    ↓
  Video player displays proxy
    ↓
  User toggles "View High Res"
    ↓
  Reload with original file path
```

**Proxy Detection Methods:**

| Method | Implementation | Reliability |
|--------|---------------|-------------|
| **PP API proxy status** | `item.hasProxy()` / proxy path property | ✅ High (if API exists) |
| File system heuristics | Check for `_Proxy.mov` suffix | ⚠️ Medium (convention-dependent) |
| User configuration | Manual proxy folder mapping | ✅ High (user-controlled) |

**Decision:** Primary = PP API, Fallback = file system heuristics

#### 4. State Management

**Decision:** Vanilla JavaScript module state (no framework)
**Rationale:**
- Existing codebase uses vanilla JS successfully
- CEP benefits from minimal overhead
- React/Vue would add ~200KB+ for marginal benefit
- Simpler debugging in CEP environment

**State Structure:**
```javascript
// Global panel state
var PanelState = {
  allClips: [],              // All project clips
  currentClip: null,         // Currently selected clip
  currentClipIndex: -1,      // Index in allClips
  proxyMode: true,           // true = proxy, false = original
  videoUrl: '',              // Current file:// URL
  isLoading: false,          // Loading state
  searchFilter: ''           // Clip browser filter
};
```

---

## Consequences

### Positive

1. **No Selection Dependency** - Panel works independently of PP Project Panel
2. **Unified Workflow** - Browse, preview, and edit metadata in one place
3. **Proxy-First** - Faster loading for large ProRes files
4. **Familiar Patterns** - Similar to existing Electron app
5. **Offline-First** - No network dependency, works with local files
6. **Scalable** - Foundation for Phase 2 AI integration

### Negative

1. **Codec Dependency** - ProRes playback requires OS codec support
2. **File Access** - CEP file:// protocol has security restrictions
3. **Panel Size** - 3-panel layout requires wider panel (min 1200px recommended)
4. **Complexity** - More complex than selection-based approach
5. **Memory** - Loading all clips upfront may impact performance on large projects

### Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **ProRes not playable in HTML5** | High | Medium | Fallback: Show frame thumbnails + "Open in Source Monitor" button |
| **PP API lacks proxy path access** | Medium | Medium | Use file system heuristics + user config |
| **CEP file:// restrictions** | High | Low | Prototype early to validate file access |
| **Large project performance** | Medium | Medium | Lazy load clips, virtual scrolling in browser |
| **Cross-platform path issues** | Medium | Medium | Path normalization utilities |

---

## Implementation Strategy

### Phase 1: Prototype & Validation (Week 1)
**Goal:** Validate critical technical assumptions

1. **Video Player Prototype**
   - Test HTML5 `<video>` with ProRes file:// URLs
   - Verify codec support on macOS/Windows
   - Measure playback performance

2. **PP API Investigation**
   - Research proxy path access in ExtendScript
   - Document available ProjectItem properties
   - Test proxy detection methods

3. **File Path Handling**
   - Test file:// URL formatting in CEP
   - Cross-platform path normalization
   - Security restriction validation

**Success Criteria:**
- ✅ ProRes plays in HTML5 video element
- ✅ file:// URLs work in CEP context
- ✅ Can detect proxy status via PP API or fallback

### Phase 2: Component Implementation (Week 2-3)
**Goal:** Build core functionality

1. **ClipBrowser Component**
2. **VideoPlayer Component**
3. **MetadataForm Refactor**
4. **State Management Integration**

### Phase 3: Integration & Polish (Week 4)
**Goal:** Production-ready panel

1. Error handling & edge cases
2. Performance optimization
3. Cross-platform testing
4. Documentation

---

## Alternatives Considered (Expanded)

### Alternative 1: Keep Selection-Based + Fix PP Integration
**Rationale for Rejection:**
- Root cause (PP selection API) is external and unreliable
- Adobe may not fix (CEP is legacy technology)
- Workarounds would be brittle

### Alternative 2: Use PP Source Monitor + Metadata Panel Only
**Rationale for Rejection:**
- User explicitly wants integrated video player
- Source Monitor can't be programmatically controlled
- Workflow still requires multiple windows

### Alternative 3: UXP Plugin (Next-gen Adobe)
**Rationale for Rejection:**
- PP 2025 CEP still supported (CSXS 12.0)
- UXP has steeper learning curve
- Less mature documentation/examples
- **Consideration:** Revisit for v2.0 after CEP validation

---

## Open Questions

### Technical Investigations Required

1. **PP ExtendScript API:**
   - ❓ Does `ProjectItem` expose proxy file path?
   - ❓ Can we detect proxy enabled/disabled state?
   - ❓ Is there a proxy attach/detach event?

2. **CEP File Protocol:**
   - ❓ Are there file size limits for file:// URLs?
   - ❓ Can we stream large ProRes files or must they load fully?
   - ❓ How does CEP handle network drives (e.g., NAS)?

3. **Performance:**
   - ❓ What's the practical limit for all-clips loading? (100? 1000? 10000?)
   - ❓ Should we implement virtual scrolling for clip browser?
   - ❓ Does video playback impact metadata form responsiveness?

### User Experience Questions

1. ❓ Should proxy/raw toggle be global or per-clip?
2. ❓ Should we auto-advance to next clip after metadata save?
3. ❓ Should video playback auto-start on clip selection?
4. ❓ Should we persist panel layout preferences?

---

## Success Metrics

### Prototype Validation (Phase 1)
- [ ] ProRes 422 plays in HTML5 video element (macOS)
- [ ] file:// URLs work in CEP context
- [ ] Proxy detection working (API or fallback)
- [ ] Performance acceptable for 100+ clip projects

### MVP Completion (Phase 3)
- [ ] Users can browse all project clips in panel
- [ ] Users can preview clips with playback controls
- [ ] Proxy-first loading works with toggle
- [ ] Metadata workflow same as current (no regressions)
- [ ] Panel works offline (no network calls)

### Phase 2 Readiness (Future)
- [ ] Architecture supports AI assistant integration
- [ ] Component boundaries clean for future enhancements
- [ ] State management scales for async operations

---

## Related Documents

- **ADR-001**: CEP Architecture (superseded by this ADR)
- **ADR-003**: ExtendScript API Contracts (to be created)
- **Implementation Roadmap**: See `IMPLEMENTATION-ROADMAP.md` (to be created)
- **Component Specifications**: See `COMPONENT-ARCHITECTURE.md` (to be created)

---

**Version:** 1.0
**Last Updated:** 2025-11-10
**Next Review:** After Phase 1 prototype completion
