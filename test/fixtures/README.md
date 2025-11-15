# Test Fixtures Directory

**Purpose:** Store captured QE DOM payloads for characterization tests during XMP-First refactor.

---

## Fixture Files

### `qe-dom-offline.json`

**Captured:** [Pending manual capture - see test/manual/002-CAPTURE-QE-DOM-PAYLOADS.md]

**Source:** `getAllProjectClips()` output from Premiere Pro (local media scenario)

**Structure:**
```json
[
  {
    // Core identification
    "nodeId": "string (unique project item ID)",
    "name": "string (filename.ext)",
    "treePath": "string (Bin1 > Bin2 > ...)",
    "mediaPath": "string (absolute file path)",

    // Metadata fields (parsed from XMP)
    "identifier": "string (dc:identifier)",
    "description": "string (dc:description - keywords)",
    "shot": "string (shotType from logComment or xmp:Shot)",
    "good": "string (xmp:Scene - legacy field)",
    "location": "string (from logComment or xmp:Location)",
    "subject": "string (from logComment or xmp:Subject)",
    "action": "string (from logComment or xmp:Action)",

    // Diagnostic fields (for debugging XMP parsing)
    "rawLogComment": "string (unparsed logComment value or 'NOT_FOUND_IN_XMP')",
    "regexAttempt": "string (lowercase-c-element-MATCHED|capital-C-element-MATCHED|...)",
    "xmpSnippet": "string (first 500 chars of XMP or ERROR:...)",
    "logCommentContext": "string (50 chars before/after logComment tag or NOT_FOUND_IN_XMP_STRING)",
    "availableColumns": "string (QE DOM columns like 'Tape=X | Desc=Y | Shot=Z' or 'NO_DIRECT_ACCESS')"
  },
  ...
]
```

**Usage:**
- Characterization tests validate XMP-First implementation matches this exact structure
- Regression tests ensure refactoring doesn't change output format
- Diagnostic fields help debug XMP parsing differences

---

### `qe-dom-online.json`

**Captured:** [Pending manual capture - see test/manual/002-CAPTURE-QE-DOM-PAYLOADS.md]

**Source:** `getAllProjectClips()` output from Premiere Pro (network media scenario)

**Expected Differences from Offline:**
- `mediaPath` values may start with `smb://` or network drive letters
- Structure should be IDENTICAL (same property names/types)
- Metadata content may differ if different test projects used

**Symlink Option:**
If online/offline scenarios produce identical output, symlink to save space:
```bash
cd test/fixtures
ln -s qe-dom-offline.json qe-dom-online.json
```

---

## Field Mapping Reference

QE DOM API fields → XMP sources:

| Field | XMP Source | Notes |
|-------|------------|-------|
| `identifier` | `dc:identifier` | Dublin Core identifier (IA compatibility) |
| `description` | `dc:description > rdf:li` | Keywords/tags (Dublin Core) |
| `location` | `xmpDM:logComment` (parsed) OR `xmp:Location` | Primary: structured logComment, Fallback: legacy field |
| `subject` | `xmpDM:logComment` (parsed) OR `xmp:Subject` | Primary: structured logComment, Fallback: legacy field |
| `action` | `xmpDM:logComment` (parsed) OR `xmp:Action` | Primary: structured logComment, Fallback: legacy field |
| `shot` | `xmpDM:logComment` (parsed) OR `xmp:Shot` | ShotType from structured logComment or legacy |
| `good` | `xmp:Scene` | Legacy field (not used in new metadata strategy) |

**Structured LogComment Format:**
```
location=hallway, subject=front-door, action=safety-chain, shotType=CU
```

**XMP Namespace Variations:**
- Premiere Pro returns XMP as ELEMENTS: `<xmpDM:logComment>...</xmpDM:logComment>`
- IA (ingest-assistant) writes lowercase 'c': `<xmpDM:logComment>`
- CEP Panel writes capital 'C': `<xmpDM:LogComment>` (BUG - should match IA)
- Current implementation tries BOTH (see `regexAttempt` diagnostic field)

---

## Capture Metadata

**Document after manual capture:**

| Property | Value |
|----------|-------|
| Capture Date | [YYYY-MM-DD] |
| Premiere Pro Version | [e.g., 25.0.0] |
| macOS Version | [e.g., macOS 15.1] |
| Test Project | [e.g., EAV036 Berkeley shoot1-20251103] |
| Clip Count (Offline) | [e.g., 8 clips] |
| Clip Count (Online) | [e.g., 8 clips or "symlinked to offline"] |

**Metadata Diversity:**
- Clips with IA-generated metadata (xmpDM:logComment)
- Clips with manual CEP panel edits
- Clips with NO metadata (blank imports)
- Mix of video (.MOV, .MP4) and image (.JPG, .PNG) files

---

## Maintenance

**When to Update Fixtures:**
- After adding new metadata fields to `getAllProjectClips()`
- When XMP parsing logic changes (pre-refactor only)
- If test projects change significantly (different metadata patterns)

**Do NOT Update During Refactor:**
- Fixtures represent BASELINE behavior (before XMP-First)
- New XMP-First implementation must MATCH these fixtures (regression test)
- Only update if baseline behavior was wrong (bug fix, not refactor)

---

**See Also:**
- `test/manual/002-CAPTURE-QE-DOM-PAYLOADS.md` - Manual capture instructions
- `test/integration/qe-dom-payloads.test.js` - Characterization tests
- `.coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md` - Build plan context
