# Implementation Roadmap - Self-Contained CEP Panel

**Document Version:** 1.0
**Date:** 2025-11-10
**Related:** ADR-002, COMPONENT-ARCHITECTURE.md, EXTENDSCRIPT-API-SPEC.md

---

## Executive Summary

### Project Goals

Transform the existing selection-based CEP panel into a **self-contained 3-panel interface** with:
- ✅ Internal clip browser (eliminates PP Project Panel dependency)
- ✅ HTML5 video player with ProRes support
- ✅ Proxy-first workflow with toggle
- ✅ Enhanced metadata form
- ✅ Foundation for Phase 2 AI integration

### Timeline Overview

| Phase | Duration | Focus | Success Criteria |
|-------|----------|-------|------------------|
| **Phase 1: Prototype & Validation** | 1 week | Validate technical assumptions | Video playback works, proxy detection proven |
| **Phase 2: Component Development** | 2 weeks | Build core functionality | All 3 components functional |
| **Phase 3: Integration & Polish** | 1 week | Production readiness | Cross-platform tested, documented |
| **Phase 4: Deployment** | 3 days | Release preparation | Extension packaged, users onboarded |

**Total Estimated Time:** 4 weeks + 3 days

---

## Phase 1: Prototype & Validation (Week 1)

### Objective
**Validate critical technical assumptions before committing to full implementation.**

### Critical Risks to Validate

1. ✅ **ProRes playback in HTML5 video** (HIGH PRIORITY)
2. ✅ **file:// protocol in CEP context** (HIGH PRIORITY)
3. ✅ **PP API proxy detection** (MEDIUM PRIORITY)
4. ✅ **Performance with 100+ clips** (MEDIUM PRIORITY)

### Tasks

#### Day 1-2: Video Player Prototype

**Goal:** Prove HTML5 `<video>` can play ProRes files via file:// URLs in CEP.

**Tasks:**
1. Create minimal CEP extension with video element
   ```html
   <video id="testVideo" controls></video>
   <script>
     var video = document.getElementById('testVideo');
     video.src = 'file:///Volumes/Media/test_prores.mov';
   </script>
   ```

2. Test scenarios:
   - ✅ ProRes 422 playback (macOS)
   - ✅ ProRes 422 playback (Windows with codec)
   - ✅ file:// URL formatting (macOS vs Windows paths)
   - ✅ Large file handling (5GB+ files)
   - ✅ Network drive paths (NAS/SMB)

3. Document findings:
   - Codec support matrix (OS + browser engine)
   - Performance metrics (time to first frame)
   - Error scenarios (unsupported codec behavior)

**Success Criteria:**
- [ ] ProRes 422 plays on macOS (native support)
- [ ] ProRes 422 plays on Windows (with QuickTime/codec installed)
- [ ] file:// URLs work in CEP browser context
- [ ] Playback performance acceptable (<2s load time for proxies)

**Risk Assessment:**
- **If ProRes doesn't play:** Fallback to "Open in Source Monitor" button + thumbnail display
- **If file:// blocked:** Research CEP security exceptions or alternative protocols

**Deliverables:**
- `/prototypes/video-player-test/` - Minimal CEP extension
- `VIDEO-PLAYBACK-FINDINGS.md` - Test results document

---

#### Day 3-4: PP API Proxy Research

**Goal:** Determine if PP ExtendScript API exposes proxy paths/status.

**Research Methods:**

1. **ExtendScript Toolkit Inspection**
   ```javascript
   // In ESTK, connected to PP:
   var project = app.project;
   var item = project.getSelection()[0];

   // Inspect all properties
   $.writeln("=== ProjectItem Properties ===");
   for (var prop in item) {
       try {
           var value = item[prop];
           $.writeln(prop + ": " + (typeof value) + " = " + value);
       } catch (e) {
           $.writeln(prop + ": [Error accessing]");
       }
   }

   // Test proxy-specific methods
   if (typeof item.hasProxy !== 'undefined') {
       $.writeln("FOUND: item.hasProxy = " + item.hasProxy);
   }

   if (typeof item.proxyMediaPath !== 'undefined') {
       $.writeln("FOUND: item.proxyMediaPath = " + item.proxyMediaPath);
   }
   ```

2. **Documentation Review**
   - Adobe Premiere Pro Scripting Guide (latest version)
   - Search for: "proxy", "proxyPath", "attachProxy", "toggleProxy"
   - Check community forums (Adobe CEP, Premiere Pro Scripting)

3. **Existing Extensions Analysis**
   - Study other CEP extensions that handle proxies
   - Check open-source PP automation scripts

**Test Scenarios:**
1. Create a clip with attached proxy in PP
2. Inspect via ExtendScript
3. Document available properties
4. Test if proxy path accessible

**Success Criteria:**
- [ ] Document PP API proxy detection capabilities
- [ ] If API unavailable, define fallback heuristics
- [ ] Test fallback proxy detection (file naming conventions)

**Fallback Strategy:**
If PP API doesn't expose proxy paths:
```javascript
// File system heuristics
function guessProxyPath(originalPath) {
    // Common conventions:
    // 1. filename_Proxy.ext
    // 2. Proxies/filename.ext
    // 3. ../Proxies/filename.ext

    var candidates = [
        originalPath.replace(/\.([^.]+)$/, '_Proxy.$1'),
        originalPath.replace(/\/([^/]+)$/, '/Proxies/$1'),
        originalPath.replace(/\/([^/]+)\/([^/]+)$/, '/$1/Proxies/$2')
    ];

    return candidates;
}
```

**Deliverables:**
- `PP-API-PROXY-RESEARCH.md` - Findings document
- `fallback-proxy-detection.js` - Heuristic implementation (if needed)

---

#### Day 5: Performance Testing

**Goal:** Validate performance with real-world project sizes.

**Test Projects:**
1. Small: 50 clips
2. Medium: 250 clips
3. Large: 1000 clips

**Metrics to Measure:**
- Time to load all clips (`getAllProjectClipsEnhanced()`)
- Memory usage (Chrome DevTools)
- UI responsiveness during clip browsing
- Video switching latency

**Performance Tests:**

1. **Clip Loading Performance**
   ```javascript
   console.time('loadAllClips');
   csInterface.evalScript('EAVIngest.getAllProjectClipsEnhanced()', function(result) {
       console.timeEnd('loadAllClips');
       var data = JSON.parse(result);
       console.log('Clips loaded:', data.clips.length);
       console.log('JSON size:', result.length, 'bytes');
   });
   ```

2. **Rendering Performance**
   ```javascript
   console.time('renderClipList');
   ClipBrowser.render(); // Render 1000 clips
   console.timeEnd('renderClipList');
   ```

3. **Memory Usage**
   - Monitor in Chrome DevTools (chrome://inspect → localhost:8093)
   - Check for memory leaks during clip navigation

**Success Criteria:**
- [ ] 1000 clips load in <5 seconds
- [ ] Clip browser renders smoothly (60fps scrolling)
- [ ] No memory leaks during navigation
- [ ] Video switching <1 second (proxy files)

**Optimizations if needed:**
- Virtual scrolling for clip list (only render visible items)
- Lazy loading (batch load clips)
- Clip metadata caching

**Deliverables:**
- `PERFORMANCE-BENCHMARKS.md` - Test results
- Performance optimization recommendations

---

### Phase 1 Deliverables

- [ ] Video playback prototype working
- [ ] PP API proxy research complete
- [ ] Performance benchmarks documented
- [ ] Go/No-Go decision for Phase 2
- [ ] Updated risk assessment

### Phase 1 Go/No-Go Decision

**Go Criteria:**
- ✅ ProRes playback works (with acceptable fallbacks)
- ✅ file:// URLs functional in CEP
- ✅ Performance acceptable for target project sizes
- ✅ Proxy detection viable (API or fallback)

**No-Go Scenarios:**
- ❌ Video playback fundamentally broken in CEP
- ❌ file:// protocol blocked by CEP security
- ❌ Performance unusable (>30s load times)

**Decision Point:** End of Week 1

---

## Phase 2: Component Development (Weeks 2-3)

### Objective
**Build the three core components with full functionality.**

### Week 2: Core Components

#### Day 1-2: ClipBrowser Component

**Tasks:**
1. Implement clip list rendering
   - HTML structure
   - CSS styling (Adobe theme)
   - Search/filter logic

2. Event handlers
   - Clip selection
   - Search input
   - Filter checkboxes

3. State management
   - Load all clips on init
   - Update on clip selection
   - Handle empty states

**Files to Create:**
- `/js/components/ClipBrowser.js` (or refactor into `main.js`)
- `/css/clip-browser.css`

**Testing:**
- Unit tests: Filter logic, search logic
- Integration: Load real PP project, verify rendering
- Edge cases: Empty project, offline clips

**Deliverables:**
- [ ] ClipBrowser component functional
- [ ] Search and filters working
- [ ] Visual design matches PP theme
- [ ] Unit tests passing

---

#### Day 3-4: VideoPlayer Component

**Tasks:**
1. Implement video element wrapper
   - HTML5 video controls
   - Custom control bar (if needed)
   - Proxy/raw toggle UI

2. File loading logic
   - Format file:// URLs
   - Proxy detection integration
   - Error handling

3. Playback controls
   - Play/pause
   - Seek bar
   - Volume control
   - Fullscreen (optional)

4. Status display
   - Codec info
   - Resolution
   - Frame rate
   - Loading state

**Files to Create:**
- `/js/components/VideoPlayer.js`
- `/css/video-player.css`

**Testing:**
- Video playback with various codecs
- Proxy toggle functionality
- Error fallback (unsupported codec)
- Cross-platform paths

**Deliverables:**
- [ ] VideoPlayer component functional
- [ ] Proxy toggle working
- [ ] Error fallback UI complete
- [ ] Video info display accurate

---

#### Day 5: MetadataForm Refactor

**Tasks:**
1. Refactor existing form code
   - Remove polling logic (no longer needed)
   - Add event listener for 'clip-selected'
   - Update navigation to use ClipBrowser state

2. Keep existing functionality
   - Form field editing
   - Generated name preview
   - Apply to Premiere
   - Validation

3. Minor UI improvements
   - Better status messages
   - Loading states
   - Keyboard shortcuts (optional)

**Files to Modify:**
- `/js/main.js` - Refactor form logic
- `/index.html` - Update structure for 3-panel layout

**Testing:**
- Metadata save/load
- Form validation
- Previous/Next navigation
- Edge cases (offline clips, missing metadata)

**Deliverables:**
- [ ] MetadataForm refactored for event-driven architecture
- [ ] All existing functionality preserved
- [ ] Navigation working via ClipBrowser

---

### Week 3: Integration & State Management

#### Day 1-2: State Management Integration

**Tasks:**
1. Implement global `PanelState` module
   ```javascript
   var PanelState = {
       allClips: [],
       currentClip: null,
       currentClipIndex: -1,
       proxyMode: true,
       searchFilter: '',
       // ... etc
   };
   ```

2. Connect components via events
   - `clip-selected` event
   - `metadata-applied` event
   - `proxy-toggled` event

3. State persistence (optional)
   - Save proxy mode preference
   - Save search filter
   - Restore on panel reload

**Files to Create:**
- `/js/PanelState.js` - Global state module
- `/js/EventBus.js` - Event handling utilities

**Testing:**
- State updates across components
- Event propagation
- Memory leaks (event listeners)

**Deliverables:**
- [ ] Global state working
- [ ] Events connecting components
- [ ] State persistence (if implemented)

---

#### Day 3-4: ExtendScript API Implementation

**Tasks:**
1. Extend `/jsx/host.jsx` with new functions
   - `getAllProjectClipsEnhanced()`
   - `getClipByNodeId()`
   - `checkProxyAvailable()`
   - `getFileInfo()`
   - `validateFilePath()`

2. Test in ExtendScript Toolkit
   - Validate JSON output
   - Test with various project types
   - Error handling

3. Integration with CEP panel
   - Update API calls to use new functions
   - Handle new data structures
   - Error handling in JavaScript

**Files to Modify:**
- `/jsx/host.jsx` - Add new functions

**Testing:**
- ExtendScript unit tests (ESTK)
- Integration tests (CEP → ExtendScript)
- Error scenarios (no project, clip not found)

**Deliverables:**
- [ ] All new ExtendScript functions implemented
- [ ] Tested in ESTK
- [ ] Integrated with CEP panel

---

#### Day 5: UI/UX Polish

**Tasks:**
1. 3-panel layout implementation
   - CSS Grid layout
   - Responsive breakpoints
   - Resize handles (if needed)

2. Visual design refinement
   - Adobe dark theme consistency
   - Icon design (SVG)
   - Animations (subtle)

3. Accessibility
   - Keyboard navigation
   - ARIA labels
   - Focus states

4. Loading states & feedback
   - Skeleton screens
   - Progress indicators
   - Status messages

**Files to Modify:**
- `/css/style.css` - Major refactor for 3-panel layout
- `/index.html` - Update structure

**Deliverables:**
- [ ] 3-panel layout complete
- [ ] Visual design polished
- [ ] Accessibility improvements
- [ ] Loading states implemented

---

### Phase 2 Deliverables

- [ ] All 3 components functional
- [ ] State management working
- [ ] ExtendScript API extended
- [ ] UI/UX polished
- [ ] Integration tests passing

---

## Phase 3: Integration & Polish (Week 4)

### Objective
**Production-ready extension with cross-platform testing and documentation.**

### Day 1-2: Error Handling & Edge Cases

**Tasks:**
1. Comprehensive error handling
   - Video playback errors
   - ExtendScript communication errors
   - File access errors
   - Network drive edge cases

2. Edge case testing
   - Empty projects
   - Offline media
   - Missing proxies
   - Very large files (>10GB)
   - Special characters in filenames
   - Network paths (UNC on Windows)

3. Graceful degradation
   - Fallback UI for unsupported codecs
   - Error messages user-friendly
   - Retry logic for transient errors

**Testing Checklist:**
- [ ] Empty project → Shows empty state
- [ ] Offline clip → Shows placeholder
- [ ] Missing proxy → Falls back to original
- [ ] Unsupported codec → Shows fallback UI
- [ ] Invalid file path → Error message
- [ ] Network drive timeout → Handles gracefully

**Deliverables:**
- [ ] Error handling comprehensive
- [ ] Edge cases tested
- [ ] Fallback UI implemented

---

#### Day 3: Cross-Platform Testing

**Tasks:**
1. macOS testing
   - ProRes playback (native support)
   - File paths (forward slashes)
   - PP 2025 compatibility

2. Windows testing
   - ProRes playback (with codec pack)
   - File paths (backslash → forward slash conversion)
   - UNC network paths (\\server\share)
   - PP 2025 compatibility

3. Test matrix:
   | OS | PP Version | Codec | Proxy | Result |
   |----|------------|-------|-------|--------|
   | macOS 14 | PP 2025 | ProRes 422 | Yes | ✅ |
   | macOS 14 | PP 2025 | ProRes 422 | No | ✅ |
   | Windows 11 | PP 2025 | ProRes 422 | Yes | ? |
   | Windows 11 | PP 2025 | ProRes 422 | No | ? |

**Deliverables:**
- [ ] macOS testing complete
- [ ] Windows testing complete
- [ ] Cross-platform issues documented
- [ ] Fixes implemented

---

#### Day 4: Performance Optimization

**Tasks:**
1. Profile performance bottlenecks
   - Chrome DevTools profiling
   - Identify slow functions
   - Memory leak detection

2. Optimizations:
   - Virtual scrolling for clip list (if needed)
   - Lazy image loading
   - Debounce search input
   - Throttle video player updates

3. Bundle optimization
   - Minify JavaScript (if applicable)
   - Optimize CSS
   - Remove unused code

**Deliverables:**
- [ ] Performance profiling complete
- [ ] Optimizations implemented
- [ ] Load time <3 seconds (1000 clips)

---

#### Day 5: Documentation & Cleanup

**Tasks:**
1. Code documentation
   - JSDoc comments
   - Function descriptions
   - Complex logic explanations

2. User documentation
   - `README.md` update
   - Installation instructions
   - User guide with screenshots
   - Troubleshooting section

3. Developer documentation
   - Architecture overview
   - Component API reference
   - ExtendScript API reference
   - Debugging guide

4. Code cleanup
   - Remove console.log statements
   - Remove commented code
   - Consistent formatting
   - Linting

**Deliverables:**
- [ ] Code fully documented
- [ ] User guide complete
- [ ] Developer docs complete
- [ ] Code cleaned up

---

### Phase 3 Deliverables

- [ ] Error handling robust
- [ ] Cross-platform tested
- [ ] Performance optimized
- [ ] Documentation complete
- [ ] Code production-ready

---

## Phase 4: Deployment (3 Days)

### Objective
**Package extension, test installation, and onboard users.**

### Day 1: Extension Packaging

**Tasks:**
1. Update manifest.xml
   - Version number
   - Compatible PP versions
   - Extension description

2. Create installer
   - macOS: DMG or ZIP
   - Windows: ZIP or installer

3. Sign extension (if required)
   - Adobe signing (if publishing to Adobe Exchange)
   - Or self-signed for internal use

4. Test installation
   - Clean install
   - Upgrade from v1.0
   - Uninstall/reinstall

**Deliverables:**
- [ ] Extension packaged
- [ ] Installation tested
- [ ] Installation guide updated

---

### Day 2: User Testing & Feedback

**Tasks:**
1. Beta testing with users
   - Install on user machines
   - Observe workflow
   - Collect feedback

2. Quick fixes
   - UI tweaks based on feedback
   - Bug fixes (if minor)
   - Documentation updates

3. Create tutorial video (optional)
   - Installation
   - Basic workflow
   - Tips & tricks

**Deliverables:**
- [ ] Beta testing complete
- [ ] Feedback incorporated
- [ ] Tutorial materials ready

---

### Day 3: Release

**Tasks:**
1. Final QA check
   - Test on clean machines
   - Verify all features
   - Check documentation

2. Release
   - Publish to internal repository
   - Or submit to Adobe Exchange (if public)
   - Announce to users

3. Support preparation
   - FAQ document
   - Support email/channel
   - Known issues list

**Deliverables:**
- [ ] Extension released
- [ ] Users notified
- [ ] Support materials ready

---

## Risk Assessment & Mitigation

### High-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **ProRes not playable in HTML5** | Medium | High | Fallback: Thumbnail + "Open in Source Monitor" |
| **PP API lacks proxy access** | Medium | Medium | Fallback: File system heuristics + user config |
| **CEP file:// restrictions** | Low | High | Early prototype to validate, research workarounds |
| **Performance issues (large projects)** | Medium | Medium | Virtual scrolling, lazy loading, caching |
| **Windows codec support** | Medium | Medium | Document codec installation, provide links |

### Medium-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Cross-platform path issues** | Medium | Low | Thorough testing, path normalization utils |
| **Memory leaks** | Low | Medium | Profile regularly, proper event cleanup |
| **Network drive latency** | Medium | Low | Timeout handling, loading indicators |
| **User adoption resistance** | Low | Low | Training materials, gradual rollout |

### Contingency Plans

**If ProRes playback fails:**
- Plan A: Provide codec installation guide
- Plan B: Fall back to thumbnail + "Open in Source Monitor" button
- Plan C: Investigate alternative video libraries (e.g., MediaSource API)

**If PP API lacks proxy info:**
- Plan A: Use file system heuristics (naming conventions)
- Plan B: Add user configuration for proxy folder mapping
- Plan C: Manual proxy path entry in settings

**If performance unacceptable:**
- Plan A: Implement virtual scrolling
- Plan B: Lazy load clips in batches (100 at a time)
- Plan C: Add "Refresh" button instead of auto-load on init

---

## Success Metrics

### Prototype Phase (Phase 1)
- [ ] Video playback working: **YES/NO**
- [ ] Proxy detection viable: **YES/NO**
- [ ] Performance acceptable: **<5s load time**

### Development Phase (Phase 2-3)
- [ ] All components functional: **3/3**
- [ ] No critical bugs: **0 critical**
- [ ] Cross-platform tested: **macOS + Windows**

### Deployment Phase (Phase 4)
- [ ] User feedback positive: **>80% satisfaction**
- [ ] Installation success rate: **>95%**
- [ ] Support tickets minimal: **<5 in first week**

---

## Dependencies & Prerequisites

### Technical Dependencies
- Premiere Pro 2025 (CSXS 12.0)
- macOS 14+ or Windows 10+
- ProRes codec (macOS native, Windows requires install)

### Team Dependencies
- Developer: 1 full-time (4 weeks)
- QA/Tester: Part-time (Phase 3)
- Designer: Part-time (UI polish, Phase 2)
- Users: Beta testers (Phase 4)

### External Dependencies
- Adobe PP API documentation
- CEP community forums
- ProRes codec availability

---

## Future Enhancements (Post-MVP)

### Phase 2: AI Integration (Planned)
- AI-powered metadata suggestions
- Automatic clip categorization
- Smart search (semantic)

### Other Ideas
- Batch metadata editing
- Export metadata to CSV
- Import metadata from CSV
- Custom metadata templates
- Keyboard shortcuts
- Panel themes (light/dark)
- Multi-select clips

---

## Appendix: File Structure

### New Files to Create

```
eav-cep-assist/
├── docs/
│   ├── ADR-002-SELF-CONTAINED-PANEL-ARCHITECTURE.md ✅
│   ├── COMPONENT-ARCHITECTURE.md ✅
│   ├── EXTENDSCRIPT-API-SPEC.md ✅
│   ├── IMPLEMENTATION-ROADMAP.md ✅ (this file)
│   ├── VIDEO-PLAYBACK-FINDINGS.md (Phase 1)
│   ├── PP-API-PROXY-RESEARCH.md (Phase 1)
│   └── PERFORMANCE-BENCHMARKS.md (Phase 1)
│
├── prototypes/
│   └── video-player-test/ (Phase 1)
│       ├── CSXS/manifest.xml
│       ├── index.html
│       └── test.js
│
├── js/
│   ├── components/ (new)
│   │   ├── ClipBrowser.js (Phase 2)
│   │   ├── VideoPlayer.js (Phase 2)
│   │   └── MetadataForm.js (Phase 2 - refactored)
│   ├── PanelState.js (Phase 2)
│   ├── EventBus.js (Phase 2)
│   └── main.js (refactored)
│
├── css/
│   ├── clip-browser.css (Phase 2)
│   ├── video-player.css (Phase 2)
│   └── style.css (refactored)
│
├── jsx/
│   └── host.jsx (extended with new functions)
│
└── index.html (refactored for 3-panel layout)
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Next Review:** End of Phase 1
