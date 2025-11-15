# POC Instructions: XMP-First Architecture Validation

**Purpose:** Validate core architectural assumptions BEFORE committing to Issue #32 refactor

**Time Required:** 10-15 minutes

**Critical:** This POC determines GO/NO-GO for the XMP-First approach. If tests fail, we avoid wasting 4 days on an unfeasible solution.

---

## What This POC Tests

### Critical Assumptions (GO/NO-GO)
1. **AdobeXMPScript works in Premiere Pro ExtendScript** ✓/✗
2. **ProjectItem.getProjectMetadata() is accessible** ✓/✗
3. **Custom XMP namespace fields persist** ✓/✗

### Validation Tests (Important but not blocking)
4. **Offline persistence** (manual test) ✓/✗
5. **Performance** (100+ clips) ✓/✗
6. **Media XMP fallback** (bonus) ✓/✗

---

## How to Run POC

### Step 1: Prepare Premiere Pro Project

**Option A: Use Existing Project**
- Open any Premiere Pro project with 5-10 video clips
- Clips can be online or offline
- Project can be empty bin structure (just needs clips)

**Option B: Create Test Project**
1. Create new Premiere Pro project
2. Import 5-10 video files (any format)
3. Leave clips in default bin

### Step 2: Run POC Script

1. **Open Premiere Pro** with test project loaded

2. **Open ExtendScript Console**
   - Menu: **Help → Console** (or Cmd+F12 on macOS)
   - Keep this console window visible to see results

3. **Run the POC script**
   - Menu: **File → Scripts → Run Script...**
   - Navigate to: `/Volumes/HestAI-Projects/eav-cep-assist/test/manual/POC-XMP-OFFLINE-ACCESS.jsx`
   - Click **Open**

4. **Watch the ExtendScript Console**
   - Script will output test results in real-time
   - Tests run sequentially (1→2→3→4→5→6)
   - Look for `[POC SUCCESS]` or `[POC ERROR]` markers

5. **Copy console output**
   - Select all text in ExtendScript Console
   - Copy to clipboard (you'll paste this back to the architect)

### Step 3: Offline Persistence Test (Manual)

**This is the CRITICAL test for Issue #32 - does project XMP survive offline media?**

After running the POC script once:

1. **Save the Premiere project** (File → Save)

2. **Make media offline** (choose ONE method):
   - **Method A:** Disconnect external drive with media
   - **Method B:** Rename the folder containing media files
   - **Method C:** Move media files to different location

3. **Close and reopen Premiere Pro**

4. **Reopen the same project**
   - Premiere will show "Media Offline" warnings → Click OK
   - Project opens with offline clips

5. **Run POC script again** (File → Scripts → Run Script)
   - This time it will test if custom fields are still readable
   - Check console for: "Fields readable from project XMP: YES"

6. **Restore media** (reconnect drive or move files back)

---

## Interpreting Results

### SUCCESS Pattern (GO Decision)

**Console Output:**
```
========================================
  POC RESULTS SUMMARY
========================================

Test 1 (XMPScript Init):       PASS ✓
Test 2 (ProjectItem Access):   PASS ✓
Test 3 (Custom Namespace):     PASS ✓
Test 4 (Offline Persistence):  PASS ✓
Test 5 (Performance):          PASS ✓
Test 6 (Media XMP - Bonus):    PASS ✓

[POC SUCCESS] CRITICAL TESTS PASSED

GO/NO-GO DECISION: ✓ GO

Core assumptions validated:
  • AdobeXMPScript is functional
  • ProjectItem metadata read/write works
  • Custom namespace fields persist

XMP-First architecture is FEASIBLE for Issue #32 refactor
```

**What This Means:**
- ✅ **Proceed with XMP-First refactor** (ADR-003)
- ✅ Core assumptions validated in real Premiere Pro environment
- ✅ Offline workflows will work as designed
- ✅ Performance acceptable for production use

**Next Steps:**
1. Report SUCCESS to architect with console output
2. Architect hands off to implementation-lead for B2 refactor
3. Estimated effort: 4 days (now validated)

---

### FAILURE Pattern (NO-GO Decision)

**Console Output:**
```
========================================
  POC RESULTS SUMMARY
========================================

Test 1 (XMPScript Init):       FAIL ✗
Test 2 (ProjectItem Access):   FAIL ✗
Test 3 (Custom Namespace):     FAIL ✗

[POC ERROR] CRITICAL TESTS FAILED

GO/NO-GO DECISION: ✗ NO-GO

Core assumptions NOT validated:
  ✗ AdobeXMPScript initialization failed
  (or other critical failures)

XMP-First architecture is NOT FEASIBLE
```

**What This Means:**
- ❌ **STOP - Do not proceed with XMP-First refactor**
- ❌ Core assumptions are invalid in this Premiere Pro version
- ❌ Alternative architecture required (ADR-003 revision)

**Next Steps:**
1. Report FAILURE to architect with full console output
2. Architect researches alternative approaches
3. Consider:
   - Different Premiere Pro version
   - Different XMP library approach
   - Hybrid solution with different storage mechanism
   - Escalate to Adobe support forums

---

### PARTIAL SUCCESS Pattern (INVESTIGATE)

**Console Output:**
```
Test 1 (XMPScript Init):       PASS ✓
Test 2 (ProjectItem Access):   PASS ✓
Test 3 (Custom Namespace):     PASS ✓
Test 4 (Offline Persistence):  PASS ✓
Test 5 (Performance):          FAIL ✗  <-- SLOW
Test 6 (Media XMP - Bonus):    FAIL ✗
```

**What This Means:**
- 🟡 **Core functionality works, but performance concern**
- ✅ Critical tests (1-4) passed → architecture is feasible
- ⚠️ Performance slower than target → may need optimization

**Next Steps:**
1. Report PARTIAL to architect with console output
2. Check Test 5 performance numbers:
   - `Avg per clip: X ms` (target: <50ms)
   - `100 clips: X seconds` (target: <5s)
3. Architect decides:
   - **Acceptable:** Proceed with optimization plan
   - **Unacceptable:** Revise architecture (caching strategy, lazy loading)

---

## Troubleshooting

### "No video clips found in project"
- **Cause:** Project has no clips or only audio/graphics
- **Fix:** Import 5-10 video files, run POC again

### "getProjectMetadata() returned undefined"
- **Cause:** Premiere Pro version may not support this API
- **Fix:** Check Premiere version (needs CC 2020+)
- **Report:** This is a NO-GO result → report to architect

### "AdobeXMPScript initialization failed"
- **Cause:** XMP library not installed or incompatible
- **Fix:** Check Premiere Pro installation integrity
- **Report:** This is a NO-GO result → report to architect

### Script hangs or crashes Premiere Pro
- **Cause:** Unexpected error in POC script
- **Fix:** Force quit Premiere, report crash log to architect
- **Workaround:** Try with smaller project (fewer clips)

---

## What to Report Back

**Copy and paste the ENTIRE ExtendScript Console output**, including:

1. **All test results** (`[POC]`, `[POC SUCCESS]`, `[POC ERROR]` lines)
2. **Performance metrics** (Test 5 numbers)
3. **Final summary** (GO/NO-GO decision)
4. **Offline test results** (after Step 3 manual test)

**Also include:**
- Premiere Pro version (Help → About Premiere Pro)
- macOS version (if on Mac)
- Number of clips in test project
- Whether media was online or offline during tests

---

## Expected Timeline

| Step | Time | Cumulative |
|------|------|------------|
| Prepare project | 2 min | 2 min |
| Run POC (first time) | 1 min | 3 min |
| Review console output | 2 min | 5 min |
| Save project, make media offline | 2 min | 7 min |
| Reopen Premiere, run POC again | 3 min | 10 min |
| Copy output, report to architect | 2 min | 12 min |

**Total: 10-15 minutes**

---

## Why This POC Saves Time

**Without POC:**
- Architect recommends XMP-First approach (based on research)
- Implementation-lead spends **4 days** refactoring
- **Day 3:** Discovers `getProjectMetadata()` returns undefined in this Premiere version
- **Result:** 3 days wasted, need to revert and try alternative

**With POC:**
- **15 minutes** to validate core assumptions
- **If FAIL:** Architect researches alternative immediately (saves 4 days)
- **If PASS:** Implementation proceeds with confidence (no wasted effort)

**Time Saved:** 3-4 days of potentially wasted development

---

## Questions?

If you encounter issues running the POC or interpreting results, report:

1. Full console output (even if it looks like an error)
2. Premiere Pro version
3. Steps taken before error occurred
4. Screenshot of error (if applicable)

Architect will analyze and provide guidance.

---

**LAST UPDATED:** 2025-11-14
**PURPOSE:** Empirical validation before architectural commitment
**AUTHORITY:** technical-architect constitutional mandate (no assumptions when prototypes available)
