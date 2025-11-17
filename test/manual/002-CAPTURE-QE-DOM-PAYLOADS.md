# Manual Capture: QE DOM Payloads for Characterization Tests

**Purpose:** Capture actual `getAllProjectClips()` output from Premiere Pro for regression testing before XMP-First refactor.

**Context:** Part of B2.1 (Characterization Tests) in XMP-First refactor plan.

---

## Prerequisites

- [ ] Premiere Pro installed and running
- [ ] Test project open with representative clips
- [ ] Clips should have diverse metadata (some with XMP, some without)
- [ ] Access to original media files (offline vs online scenarios)

---

## Capture Procedure

### Offline Scenario (Local Media)

**Objective:** Capture QE DOM output when all media is on local disk (not networked).

**Steps:**

1. **Open test project**
   - Project should contain 5-10 clips with varying metadata states:
     - Some clips with IA-generated metadata (xmpDM:logComment)
     - Some clips with manual CEP panel edits
     - Some clips with NO metadata (blank/new imports)
     - Mix of video (.MOV, .MP4) and image (.JPG, .PNG) files

2. **Verify media is local**
   ```
   Right-click clip → Reveal in Finder
   Ensure path is local (e.g., /Volumes/LocalDrive/...)
   NOT network (e.g., smb://server/...)
   ```

3. **Run capture script**
   ```
   Premiere Pro → File → Scripts → Run Script File...
   Navigate to: test/manual/capture-qe-dom-payload.jsx
   Click "Open"
   ```

4. **Verify capture success**
   - Alert dialog should appear: "QE DOM Payload Captured!"
   - Note clips count (should match project panel count)

5. **Review captured JSON**
   ```bash
   open ~/Desktop/qe-dom-output.json
   ```
   - Verify structure looks correct (array of clip objects)
   - Check metadata fields are populated (identifier, description, etc.)
   - Look for diagnostic fields (rawLogComment, regexAttempt, etc.)

6. **Copy to fixtures directory**
   ```bash
   cp ~/Desktop/qe-dom-output.json \
      test/fixtures/qe-dom-offline.json
   ```

7. **Verify tests pass**
   ```bash
   npm test -- qe-dom-payloads.test.js
   ```
   - All tests should now PASS (GREEN phase)

---

### Online Scenario (Network Media)

**Objective:** Capture QE DOM output when media is on network storage.

**Steps:**

1. **Open test project with network media**
   - Project should point to networked files (e.g., NAS, SMB share)
   - Verify paths start with `smb://` or network drive letter

2. **Run capture script**
   ```
   Premiere Pro → File → Scripts → Run Script File...
   Navigate to: test/manual/capture-qe-dom-payload.jsx
   Click "Open"
   ```

3. **Copy to fixtures directory**
   ```bash
   cp ~/Desktop/qe-dom-output.json \
      test/fixtures/qe-dom-online.json
   ```

4. **Verify structure matches offline**
   ```bash
   npm test -- qe-dom-payloads.test.js
   ```
   - Test: "should have identical structure to offline scenario" should PASS

**NOTE:** If online/offline scenarios produce identical output, you can skip online capture and symlink:

```bash
cd test/fixtures
ln -s qe-dom-offline.json qe-dom-online.json
```

---

## Validation Checklist

After capturing fixtures, verify:

- [ ] `test/fixtures/qe-dom-offline.json` exists
- [ ] `test/fixtures/qe-dom-online.json` exists (or symlinked)
- [ ] Fixtures contain 5+ clips with diverse metadata states
- [ ] `npm test -- qe-dom-payloads.test.js` passes (all 8 tests GREEN)
- [ ] Fixtures are committed to git (for regression testing)

---

## Fixture Structure Reference

Expected JSON structure from `getAllProjectClips()`:

```json
[
  {
    "nodeId": "abc123...",
    "name": "EA001932.MOV",
    "treePath": "Berkeley > EAV036",
    "mediaPath": "/Volumes/EAV_Video_RAW/.../EA001932.MOV",

    "identifier": "EA001932",
    "description": "door, chain, lock",
    "shot": "CU",
    "good": "",
    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",

    "rawLogComment": "location=hallway, subject=front-door, action=safety-chain, shotType=CU",
    "regexAttempt": "lowercase-c-element-MATCHED",
    "xmpSnippet": "<?xpacket begin=...",
    "logCommentContext": "...logComment>location=hallway...",
    "availableColumns": "Tape= | Desc= | Shot=CU | LogComment(space)=..."
  },
  ...
]
```

---

## Troubleshooting

### Capture script fails with "No active project"
- **Solution:** Open a project in Premiere Pro before running script

### Capture script fails with "getAllProjectClips is not defined"
- **Solution:** Ensure `#include "../../jsx/host.jsx"` path is correct
- **Check:** Run from `test/manual/` directory (relative path matters)

### Output JSON is empty array `[]`
- **Solution:** Project panel has no clips (import some media first)

### Tests fail with "Fixture file not found"
- **Solution:** Ensure you copied JSON to `test/fixtures/` directory (not just Desktop)

### Tests fail with "should contain required clip properties"
- **Solution:** Fixture structure changed - review `jsx/host.jsx:getAllProjectClips()` for property names
- **Check:** Compare fixture keys vs. test expectations

---

## Metadata Documentation

Record metadata about captured fixtures:

**Capture Date:** _[YYYY-MM-DD]_
**Premiere Pro Version:** _[e.g., 25.0.0]_
**macOS Version:** _[e.g., macOS 15.1]_
**Test Project:** _[e.g., EAV036 Berkeley shoot1-20251103]_
**Clip Count (Offline):** _[e.g., 8 clips]_
**Clip Count (Online):** _[e.g., 8 clips]_

**Metadata Diversity:**
- _[X]_ Clips with IA-generated metadata (xmpDM:logComment)
- _[X]_ Clips with manual CEP panel edits
- _[X]_ Clips with NO metadata (blank imports)
- _[X]_ Mix of video/image file types

**Notes:**
_[Any anomalies, edge cases, or interesting findings during capture]_

---

**Next Steps:**

After fixtures captured and tests passing:
1. Proceed to B2.1.1 (Performance Baseline)
2. Use fixtures for XMP-First implementation validation (B2.2)
3. Compare new XMP implementation output vs. these fixtures (regression)

**Evidence Required:**
- Fixture files committed to git
- Test output showing 8/8 passing
- Capture metadata documented above
