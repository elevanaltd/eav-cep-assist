# ACTION REQUIRED: Manual QE DOM Payload Capture

**Status:** ⚠️ BLOCKING - B2.1 completion pending
**Priority:** HIGH
**Estimated Time:** 15-20 minutes
**Required By:** Before proceeding to B2.2 (XMP-First Implementation)

---

## SITUATION

**Testguard Review Finding:**
Current characterization tests use SYNTHETIC fixtures (code-derived) instead of ACTUAL Premiere Pro output. While TDD discipline was followed correctly, production readiness requires EMPIRICAL data.

**Impact:**
- Code review BLOCKED until real fixtures captured
- XMP-First refactor cannot proceed without baseline behavior locked in
- Risk: Synthetic data may miss edge cases or formatting differences

**Testguard Verdict:**
> "Characterization tests must lock in actual product behavior; synthetic data risks encoding assumptions rather than truth. Manual capture aligns with RED phase intent and preserves TDD credibility."

---

## REQUIRED ACTION

Execute manual capture script in Premiere Pro to replace synthetic fixtures with real QE DOM output.

### Prerequisites

- [ ] Premiere Pro installed and running
- [ ] Access to test project with 10-15 diverse clips (recommendations below)
- [ ] Test project includes varied metadata states (some IA, some manual, some empty)

### Test Project Recommendations

**Ideal Characteristics:**
- **Clip Count:** 10-15 clips minimum
- **Bin Structure:** Multiple bins (Bin1 > SubBin1, Bin2, Root clips, etc.)
- **Media Types:** Mix of MOV, MP4, JPG, PNG
- **Metadata Diversity:**
  - 3-4 clips with IA-generated metadata (xmpDM:logComment lowercase)
  - 2-3 clips with CEP panel-written metadata (xmpDM:LogComment capital)
  - 2-3 clips with NO metadata (blank imports, never processed)
  - 1-2 clips with legacy XMP fields (xmp:Location, xmp:Subject without logComment)
  - 1 clip with XMP parsing errors (if possible)

**Suggested Project:** EAV036 Berkeley shoot1-20251103 (if available) or similar production project

---

## EXECUTION STEPS

### Step 1: Open Test Project in Premiere Pro

```
1. Launch Premiere Pro
2. File > Open Project
3. Select project with diverse clip metadata
4. Wait for project to fully load
```

### Step 2: Run Capture Script

```
1. Premiere Pro → File → Scripts → Run Script File...
2. Navigate to:
   /Volumes/HestAI-Projects/eav-cep-assist/test/manual/capture-qe-dom-payload.jsx
3. Click "Open"
4. Wait for script execution (5-10 seconds)
5. Alert dialog appears: "QE DOM Payload Captured!"
6. Note clips count displayed
```

### Step 3: Review Captured Output

```bash
# Open captured JSON
open ~/Desktop/qe-dom-output.json

# Validate structure looks correct:
# - Array of clip objects
# - Each clip has nodeId, name, treePath, mediaPath
# - Metadata fields populated (identifier, description, location, subject, action, shot)
# - Diagnostic fields present (rawLogComment, regexAttempt, xmpSnippet, etc.)
```

**Quick Validation Checklist:**
- [ ] File is valid JSON (opens without errors)
- [ ] Array contains 10+ clips
- [ ] First clip has all expected properties (compare to synthetic fixture)
- [ ] Metadata diversity visible (some clips with data, some empty)
- [ ] Diagnostic fields show parsing paths (lowercase-c-element-MATCHED, etc.)

### Step 4: Replace Synthetic Fixtures

```bash
cd /Volumes/HestAI-Projects/eav-cep-assist/test/fixtures

# Backup synthetic fixtures (optional)
cp qe-dom-offline.json qe-dom-offline.json.synthetic

# Replace with real capture
cp ~/Desktop/qe-dom-output.json qe-dom-offline.json

# If online/offline identical, keep symlink
# Otherwise, repeat capture with network media project
```

### Step 5: Verify Tests Still Pass

```bash
cd /Volumes/HestAI-Projects/eav-cep-assist

# Run characterization tests
npm test -- qe-dom-payloads.test.js

# Expected: 8/8 tests passing
# If any fail, review differences between synthetic vs. real structure
```

### Step 6: Document Capture Metadata

Edit `test/fixtures/README.md` and update "After Manual Capture" section:

```markdown
**After Manual Capture (Update This Section):**

| Property | Value |
|----------|-------|
| Capture Date | 2025-11-15 |
| Premiere Pro Version | 25.0.0 |
| macOS Version | macOS 15.1 |
| Test Project | EAV036 Berkeley shoot1-20251103 |
| Clip Count (Offline) | 12 clips |
| Clip Count (Online) | symlinked to offline |
```

### Step 7: Commit Real Fixtures

```bash
git add test/fixtures/qe-dom-offline.json test/fixtures/README.md
git commit -m "feat: Replace synthetic fixtures with real QE DOM capture

Testguard Review: B2.1 - Empirical data required for characterization

- Captured from Premiere Pro 25.0.0 (macOS 15.1)
- Test project: EAV036 Berkeley shoot1-20251103
- 12 clips with diverse metadata states
- Replaces synthetic code-derived fixtures

Testguard finding: Characterization tests must lock in ACTUAL
product behavior. Synthetic data risks encoding assumptions.

Evidence: npm test -- qe-dom-payloads.test.js shows 8/8 passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## TROUBLESHOOTING

### Capture script fails with "No active project"
**Solution:** Ensure project is open in Premiere Pro before running script

### Output JSON is empty array `[]`
**Solution:** Project panel has no clips - import media first

### Tests fail after replacing fixtures
**Likely Cause:** Real structure differs from synthetic expectations

**Investigation Steps:**
1. Compare synthetic vs. real fixture structure
2. Check property names (case sensitivity, spelling)
3. Look for unexpected XMP parsing results
4. Review ExtendScript console for errors

**Resolution:** Update tests to match real structure (this is EXPECTED for characterization)

### Clip count < 10
**Solution:** Import more diverse clips before capture (see "Test Project Recommendations")

---

## SUCCESS CRITERIA

- [ ] Real fixtures captured from Premiere Pro (not synthetic)
- [ ] `test/fixtures/qe-dom-offline.json` contains 10+ clips
- [ ] Fixtures include metadata diversity (IA, manual, empty, legacy)
- [ ] `npm test -- qe-dom-payloads.test.js` shows 8/8 passing
- [ ] Capture metadata documented in `test/fixtures/README.md`
- [ ] Real fixtures committed to git
- [ ] Testguard review artifact (`test/manual/TESTGUARD-REVIEW-B2.1.md`) reviewed

---

## WHAT HAPPENS NEXT

After manual capture complete:

1. **Testguard Re-Validation:** (Optional) Confirm empirical fixtures adequate
2. **Code Review:** Proceed to code-review-specialist
3. **B2.1 Completion:** Mark task complete in build plan
4. **B2.2 Readiness:** XMP-First implementation can begin with confidence

---

## NOTES

**Why Manual Capture Required:**

ExtendScript runs inside Premiere Pro (not automated). While synthetic fixtures work for CI, characterization tests MUST validate actual behavior to:
- Catch undocumented edge cases
- Verify XMP parsing matches production reality
- Establish regression baseline for refactor

**Alternative (Not Recommended):**

If test project unavailable, synthetic fixtures CAN be used temporarily BUT:
- Document as technical debt in build plan
- Flag in code review as provisional
- Replace with real capture BEFORE production deployment

**Testguard Philosophy:**

> "Test integrity currently upheld but contingent on replacing synthetic fixtures before code review proceeds. Test methodology consultation required for fixture strategy confirmation."

---

**Created:** 2025-11-15
**Author:** implementation-lead
**Reviewer:** test-methodology-guardian
**Status:** AWAITING USER ACTION
