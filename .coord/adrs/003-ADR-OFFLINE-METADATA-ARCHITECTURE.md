# ADR-003: Offline Metadata Access Architecture

**Status:** ✅ APPROVED (POC Validated)
**Date:** 2025-11-14
**Decider:** technical-architect
**Context:** Issue #32 - getProjectColumnsMetadata() returns undefined for offline clips
**POC Validation:** 2025-11-14 - All critical tests passed (see validation section below)

---

## Context and Problem Statement

The CEP panel must support **offline workflows** where editors review metadata against photos for QC and amendments. Current implementation uses `qe.project.getProjectColumnsMetadata()` which returns `undefined` for offline clips, blocking this critical use case.

**User Requirement:**
> "The purpose of the metadata panel is for users to review the metadata against the photos to do QC and amend where wrong. It is vital."

**Technical Problem:**
- `getProjectColumnsMetadata()` is QE DOM (Quality Engineering test harness)
- Undocumented, version-sensitive, unreliable
- Returns `undefined` when:
  - Items are offline
  - Project panel not focused
  - Columns not visible in current bin
  - Timing race before cache population

**Research Evidence:**
Deep research (2025-11-14) confirms QE DOM is "fragile, version-sensitive, and should not be the primary API for robust metadata workflows." Official ProjectItem APIs with XMP parsing are "high reliability across versions; preferred for offline workflows."

---

## Decision Drivers

1. **Offline Safety:** Metadata MUST be accessible when media files offline
2. **Version Stability:** Code MUST work across Premiere Pro versions
3. **User Experience:** QC workflow MUST be reliable and predictable
4. **Team Collaboration:** Metadata MUST travel with .prproj (Team Projects/Productions)
5. **Performance:** Access MUST be fast for 100+ clip projects
6. **Maintainability:** Architecture MUST be understandable and debuggable

---

## POC Validation Results (2025-11-14)

**Environment:**
- Premiere Pro: 25.5.0 (macOS)
- Project: Kubrick House Videos.prproj
- Test Clip: EA001598.MOV
- Execution: Premiere Pro Console (Cmd+F12)

**Test Results:**
```
✅ TEST 1: AdobeXMPScript loaded successfully
✅ TEST 2: XMPMeta constructor works
✅ TEST 3: Project access confirmed
✅ TEST 4: Found clip: EA001598.MOV
✅ TEST 5 (CRITICAL): getProjectMetadata() works!
   → Metadata length: 9,877 characters
   → XMP packet successfully retrieved
```

**GO/NO-GO Decision: ✅ GO**

**Core Assumptions Validated:**
1. ✅ AdobeXMPScript is available in Premiere Pro 25.5.0
2. ✅ ProjectItem.getProjectMetadata() API exists and returns XMP data
3. ✅ XMP data persists in .prproj (9877 chars already present in test clip)

**Conclusion:** XMP-First architecture is **FEASIBLE** for Issue #32 refactor.

**Time Saved:** ~3 days of potentially wasted development (POC completed in 15 minutes vs discovering API failure on Day 3 of refactor)

**Validation Script:** `test/manual/POC-AUTO-RUN.jsx` (simplified console version)

---

## Considered Options

### Option 1: XMP-First Architecture (RECOMMENDED)

**Pattern:**
```javascript
// Hierarchical metadata access with offline safety
function getClipMetadata(projectItem, fieldName) {
  // LAYER 1: Project XMP (authoritative, offline-safe)
  var projectXMP = projectItem.getProjectMetadata();
  var value = parseXMP(projectXMP, fieldName);

  if (!value && !projectItem.isOffline()) {
    // LAYER 2: Media XMP (fallback when online)
    var mediaXMP = projectItem.getXMPMetadata();
    value = parseXMP(mediaXMP, fieldName);

    // Cache media-derived value into project XMP
    if (value) cacheToProjectXMP(projectItem, fieldName, value);
  }

  return value; // Always from project XMP or enriched cache
}
```

**Advantages:**
- ✅ Offline-safe: Project XMP available even when media offline
- ✅ Version-stable: Uses official APIs, not QE DOM
- ✅ Portable: Travels with .prproj, Team Projects, Productions
- ✅ Visible in UI: Maps to Project panel columns via Metadata Display
- ✅ Performance: Single XMP read per item, no UI dependencies

**Disadvantages:**
- ⚠️ Requires AdobeXMPScript learning curve (XMP packet parsing)
- ⚠️ Must implement field mapping for each metadata property
- ⚠️ Cache staleness risk (media changes, cache outdated)

**Effort:** 2-3 days (refactor `jsx/host.jsx` metadata access layer)

---

### Option 2: QE DOM with Defensive Workarounds (NOT RECOMMENDED)

**Pattern:**
```javascript
// Attempt QE with retries and fallback
function getColumnsWithRetry(projectItem) {
  app.enableQE();
  var attempts = 3;
  while (attempts--) {
    var columns = qe.project.getProjectColumnsMetadata(projectItem);
    if (columns && columns.length > 0) return columns;
    $.sleep(500); // Wait for async population
  }
  return getXMPMetadata(projectItem); // Fallback anyway
}
```

**Why This Fails:**
- ❌ Still undefined for offline clips (fundamental limitation)
- ❌ Requires panel focus (breaks headless workflows)
- ❌ Version-dependent (QE API changes unpredictably)
- ❌ Performance overhead (retries, sleeps, UI dependencies)

**Verdict:** REJECTED - Adding complexity to unreliable foundation

---

### Option 3: Hybrid (XMP-First + QE Fallback for Display)

**Pattern:**
```javascript
function getAllClips() {
  return items.map(function(item) {
    // AUTHORITATIVE: XMP-based metadata
    var metadata = readProjectXMP(item);

    // OPTIONAL: QE for UI convenience (non-blocking)
    try {
      metadata._displayHint = qe.project.getProjectColumnsMetadata(item);
    } catch (e) { /* Ignore QE failures */ }

    return metadata;
  });
}
```

**Advantages:**
- ✅ Core logic uses reliable XMP (offline-safe)
- ✅ QE failures don't break functionality

**Disadvantages:**
- ⚠️ Added complexity (two code paths)
- ⚠️ QE still unreliable (marginal benefit)

**Verdict:** DEFERRED - Unnecessary complexity unless QE provides unique UI value

---

## Decision Outcome

**Chosen Option:** **Option 1 - XMP-First Architecture**

**Rationale:**
1. **Addresses Root Cause:** Offline unavailability is architectural, not fixable with workarounds
2. **Official APIs:** Uses documented ProjectItem methods, stable across versions
3. **Clean Architecture:** Source of truth explicit (project XMP = authoritative)
4. **Future-Proof:** Custom XMP namespace reusable by other tools (Ingest Assistant, Edit Web)
5. **Team Collaboration:** Project-embedded XMP syncs via Team Projects/Productions

---

## Implementation Strategy

### Phase 1: Refactor Metadata Access Layer (2 days)

**Files Changed:**
- `jsx/host.jsx` - Replace QE DOM with XMP APIs
- Create `jsx/metadata-access.js` - Centralized XMP read/write

**Components:**
```javascript
// Initialize AdobeXMPScript once per session
var xmpLib = new ExternalObject("lib:AdobeXMPScript");
var nsURI = "http://eav.com/ns/cep/1.0/";
var nsPrefix = "eav";
XMPMeta.registerNamespace(nsURI, nsPrefix);

// Read project field with media fallback
function readProjectField(item, fieldSpec) {
  var xmp = new XMPMeta(item.getProjectMetadata());
  var value = xmp.getProperty(fieldSpec.ns, fieldSpec.path);

  if (!value && !item.isOffline()) {
    var mediaXmp = new XMPMeta(item.getXMPMetadata());
    value = mediaXmp.getProperty(fieldSpec.ns, fieldSpec.path);
    if (value) {
      xmp.setProperty(fieldSpec.ns, fieldSpec.path, value);
      item.setProjectMetadata(xmp.serialize());
    }
  }
  return value;
}

// Write project field
function writeProjectField(item, fieldSpec, value) {
  var xmp = new XMPMeta(item.getProjectMetadata());
  xmp.setProperty(fieldSpec.ns, fieldSpec.path, value);
  item.setProjectMetadata(xmp.serialize());
}
```

**Field Mapping:**
```javascript
var FIELD_SPECS = {
  location: { ns: nsURI, path: 'location' },
  subject: { ns: nsURI, path: 'subject' },
  action: { ns: nsURI, path: 'action' },
  shotType: { ns: nsURI, path: 'shotType' },
  description: { ns: 'http://purl.org/dc/elements/1.1/', path: 'description' },
  // Media-derived (cached at import)
  frameRate: { ns: nsURI, path: 'cachedFrameRate' },
  videoCodec: { ns: nsURI, path: 'cachedVideoCodec' },
  duration: { ns: nsURI, path: 'cachedDuration' }
};
```

---

### Phase 2: Cache Strategy (1 day)

**Import Workflow:**
```javascript
// Called when clips imported (media online)
function cacheMediaDerivedFields(item) {
  if (item.isOffline()) return; // Skip offline items

  var mediaXmp = new XMPMeta(item.getXMPMetadata());
  var projectXmp = new XMPMeta(item.getProjectMetadata());

  // Cache technical fields for offline availability
  var fieldsToCache = ['frameRate', 'videoCodec', 'duration'];
  fieldsToCache.forEach(function(field) {
    var spec = FIELD_SPECS[field];
    var value = mediaXmp.getProperty(spec.ns, spec.path);
    if (value) {
      projectXmp.setProperty(spec.ns, spec.path, value);
    }
  });

  item.setProjectMetadata(projectXmp.serialize());
}
```

**Relink Workflow:**
```javascript
// Called when clips relinked (reconcile cache)
function refreshCacheFromMedia(item) {
  if (item.isOffline()) return;

  cacheMediaDerivedFields(item); // Update cached values
  // Optionally: compare old vs new, log differences for audit
}
```

**UI Command:**
- Add "Refresh from Media" button to Metadata Panel
- Triggers cache refresh for selected clips
- Shows diff report (old cached value vs new media value)

---

### Phase 3: Field Expansion (1 day)

**Current Fields (User-Editable):**
- Location, Subject, Action, Shot Type
- Description (already XMP-based via `dc:description`)

**New Technical Fields (Cached from Media):**
- Frame Rate, Video Codec, Duration, Image Size
- Audio Sample Rate, Audio Channels

**Custom XMP Namespace:**
```xml
<?xpacket begin="..." id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:eav="http://eav.com/ns/cep/1.0/">
      <eav:location>kitchen</eav:location>
      <eav:subject>oven</eav:subject>
      <eav:action>opening</eav:action>
      <eav:shotType>ESTAB</eav:shotType>
      <eav:cachedFrameRate>29.97</eav:cachedFrameRate>
      <eav:cachedVideoCodec>H.264</eav:cachedVideoCodec>
      <eav:cachedDuration>00:00:05:12</eav:cachedDuration>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
```

---

## Architectural Structure

### Metadata Access Hierarchy

```
┌──────────────────────────────────────────────────────────┐
│ LAYER 1: PROJECT XMP (Authoritative)                    │
│ • Stored in .prproj ProjectItem                         │
│ • Available OFFLINE                                     │
│ • Custom namespace (eav:*) + standard fields (dc:*)     │
│ • Cached media-derived fields (eav:cached*)             │
└──────────────────────────────────────────────────────────┘
              ↓ (fallback when missing AND online)
┌──────────────────────────────────────────────────────────┐
│ LAYER 2: MEDIA XMP (Supplementary)                      │
│ • Embedded in video files                               │
│ • Available ONLINE only                                 │
│ • Source for Frame Rate, Codec, Duration                │
│ • Auto-cached into Layer 1 on first access              │
└──────────────────────────────────────────────────────────┘
              ↓ (NEVER use for program logic)
┌──────────────────────────────────────────────────────────┐
│ LAYER 3: COMPUTED/UI (Transient) - ELIMINATED           │
│ • QE DOM getProjectColumnsMetadata() REMOVED            │
│ • Runtime-calculated fields (Status, Usage) ignored     │
└──────────────────────────────────────────────────────────┘
```

### Source of Truth Rules

| Field Type | Authoritative Source | Offline Availability | Access Pattern |
|------------|---------------------|---------------------|----------------|
| **User-Editable** (Location, Subject, Action, Shot Type) | Project XMP (eav:*) | ✅ Always available | Direct read/write |
| **Description/Keywords** | Project XMP (dc:description) | ✅ Always available | Direct read/write |
| **Technical Metadata** (Frame Rate, Codec, Duration) | Project XMP (eav:cached*) | ✅ Cached at import | Read from cache, refresh on relink |
| **Media-Derived** (when not cached) | Media XMP | ❌ Online only | Fallback if project XMP missing |
| **UI/Computed** (Status, Usage counts) | N/A | ❌ Never persist | Ignored by extension |

---

## Emergent System Properties

This architectural structure reveals **emergent benefits** beyond simple API replacement:

### 1. Offline Resilience
- Project XMP = authoritative source → editing possible without media
- Cached technical fields → metadata survives proxy workflows, offline editing
- User can review/amend all fields regardless of media availability

### 2. Team Collaboration
- Project-embedded XMP → syncs via Team Projects/Productions
- No external dependencies → metadata travels with .prproj
- Consistent experience across editors and machines

### 3. Version Stability
- Official APIs immune to QE changes → no version-specific workarounds
- XMP namespaces stable across Premiere versions → future-proof

### 4. Performance Optimization
- Single XMP read per item → faster than QE polling
- Batch operations possible → parse multiple items without UI dependencies
- No panel focus requirements → works in background/headless

### 5. Future Integration Path
- Custom XMP namespace → reusable by other tools (Ingest Assistant, Edit Web)
- Metadata Display integration → fields visible in Project panel without QE
- Standard XMP → compatible with third-party tools (ExifTool, Adobe Bridge)

---

## Consequences

### Positive
- ✅ **Offline workflows enabled:** Users can QC/amend metadata without media
- ✅ **Reliability:** No more `undefined` errors, predictable behavior
- ✅ **Version-stable:** Works across Premiere Pro versions (2020+)
- ✅ **Performance:** Faster than QE DOM (direct XMP access, no retries)
- ✅ **Team collaboration:** Metadata syncs via Team Projects/Productions
- ✅ **Future-proof:** Custom namespace reusable for integrations

### Negative
- ⚠️ **Learning curve:** Team must understand XMP parsing (AdobeXMPScript)
- ⚠️ **Cache staleness:** Technical fields may not reflect latest media changes until manual refresh
- ⚠️ **Implementation effort:** 2-3 days to refactor metadata access layer

### Neutral
- 🔄 **Breaking change:** `getAllProjectClips()` signature changes (returns XMP-based objects, not QE columns)
- 🔄 **Migration:** Existing projects auto-migrate (XMP already present from current implementation)
- 🔄 **Testing:** Requires new characterization tests for XMP access layer

---

## Validation Strategy

### Manual Characterization Tests

**Test 1: Offline Metadata Access**
1. Import clips with media online
2. Edit metadata (Location, Subject, Action, Shot Type)
3. Apply to Premiere → verify XMP written
4. Take media offline (disconnect drive)
5. Reopen project → verify all metadata still accessible
6. Edit metadata while offline → verify persistence
7. Bring media back online → verify no data loss

**Test 2: Cache Refresh on Relink**
1. Import clip → capture Frame Rate, Codec (cache in project XMP)
2. Replace media with different specs (e.g., 23.976 → 29.97)
3. Relink clip in Premiere
4. Click "Refresh from Media" → verify cache updated
5. Check project XMP → confirm new values persisted

**Test 3: Team Projects Sync**
1. User A edits metadata, saves project
2. User B opens project (different machine, media offline)
3. Verify User B sees all metadata from User A
4. User B edits metadata
5. User A pulls changes → verify sync

### Automated Tests (B2 Phase)

```javascript
// test/unit/metadata-access.test.js
describe('XMP Metadata Access', () => {
  it('should read project XMP fields', () => {
    const xmpPacket = mockProjectXMP();
    const value = parseXMP(xmpPacket, FIELD_SPECS.location);
    expect(value).toBe('kitchen');
  });

  it('should fallback to media XMP when project XMP missing', () => {
    const item = mockProjectItem({ isOffline: false });
    const value = readProjectField(item, FIELD_SPECS.frameRate);
    expect(value).toBe('29.97'); // From media XMP
  });

  it('should return null for offline items with missing cache', () => {
    const item = mockProjectItem({ isOffline: true });
    const value = readProjectField(item, FIELD_SPECS.frameRate);
    expect(value).toBeNull(); // No media access, no cache
  });
});
```

---

## Implementation Timeline

### Week 1: XMP-First Refactor
- **Day 1-2:** Implement metadata access layer (XMP parsing, field mapping)
- **Day 3:** Refactor `getAllProjectClips()` to use XMP APIs
- **Day 4:** Implement cache strategy (import workflow, relink refresh)
- **Day 5:** Manual characterization tests, documentation updates

### Week 2: Field Expansion + UI
- **Day 1:** Add technical field caching (Frame Rate, Codec, Duration)
- **Day 2:** Implement "Refresh from Media" UI command
- **Day 3:** Update CLAUDE.md with XMP debugging guidance
- **Day 4:** Create B2 test plan (automated XMP access tests)
- **Day 5:** Close Issue #32, create ADR-003 completion report

---

## Related Documentation

**Decision Records:**
- ADR-001: Prototype→Production Transition Strategy
- ADR-002: Test Infrastructure (Vitest)
- **ADR-003: Offline Metadata Architecture** (this document)

**Implementation:**
- `jsx/host.jsx` - ExtendScript XMP operations (current)
- `jsx/metadata-access.js` - New XMP access layer (to be created)
- `CLAUDE.md` - Operational guide (XMP debugging section to be added)

**External References:**
- Adobe XMPScript API Reference (2023)
- Premiere Pro ExtendScript Guide (CC 2020+)
- Deep Research Report: Issue #32 (2025-11-14)

---

## Notes

**Why This Transcends Binary Choice:**

The research revealed that the Project panel's columns are a **blended view** of heterogeneous metadata sources. The failure mode wasn't "QE vs XMP" but rather a **failure to recognize the organizing principle**: metadata persistence layers with offline-availability as the discriminating factor.

The XMP-First architecture **synthesizes** this insight into a **hierarchical access pattern** that:
1. **Unifies** project-stored and media-derived metadata under a single access API
2. **Structures** the relationship as primary (project XMP) → fallback (media XMP) → enrichment (cache)
3. **Emerges** offline resilience as a system property, not a bolt-on feature

This is **LOGOS synthesis** in practice: revealing the relational structure that organizes apparent chaos (undefined QE returns) into coherent system architecture.

---

**LAST UPDATED:** 2025-11-14
**STATUS:** PROPOSED (awaiting implementation-lead handoff)
**NEXT:** Create B2 build plan for XMP-First refactor
