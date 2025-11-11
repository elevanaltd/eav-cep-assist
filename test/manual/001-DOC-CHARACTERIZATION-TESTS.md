# Characterization Tests (Manual - Requires Premiere Pro)

**Purpose:** Document manual tests for CEP behaviors that cannot be automated

**Why Manual:** Adobe APIs (XMP write, Project Panel interaction) require Premiere Pro running

---

## TEST-001: XMP Namespace-Aware Write (CRITICAL)

**Priority:** 🔴 CRITICAL
**Risk:** Metadata corruption if broken
**Bug History:** Issue #4 (XMP namespace collision) recently fixed
**Frequency:** Run before ANY refactoring of `jsx/host.jsx:177-447`

### Prerequisites
- Premiere Pro running
- Test project with clip `EA001601.MOV` (or any MOV file)
- Both panels deployed and loaded

### Test Procedure

#### Step 1: Fill Metadata Form
1. Open Navigation Panel → Click clip `EA001601.MOV`
2. Metadata Panel should auto-load clip info
3. Fill ALL fields:
   - **Identifier:** `EA001601.MOV`
   - **Description:** `kitchen, spur-switch, appliances`
   - **Location:** `kitchen`
   - **Subject:** `spur-switch`
   - **Action:** `opening`
   - **Shot Type:** `ESTAB`
4. Verify Generated Name displays: `kitchen-spur-switch-opening-ESTAB`

#### Step 2: Save Metadata
1. Click "Apply to Premiere" button
2. Wait for green checkmark (✓ Updated) to appear
3. Open ExtendScript Console (Premiere Pro → Help → Console)
4. Verify console output shows namespace separation:
   ```
   DEBUG SAVE: Updating metadata for EA001601.MOV
   dc:description updated
   xmp:Location updated
   xmp:Subject updated
   xmp:Action updated
   xmp:ShotType updated
   ```

#### Step 3: Verify Persistence
1. Click a DIFFERENT clip in Navigation Panel (form should clear)
2. Click `EA001601.MOV` again (reload)
3. Verify ALL fields persist with EXACT values:
   - Identifier: `EA001601.MOV`
   - Description: `kitchen, spur-switch, appliances`
   - Location: `kitchen`
   - Subject: `spur-switch`
   - Action: `opening`
   - Shot Type: `ESTAB`

#### Step 4: Verify Premiere Pro Fields
1. Open Premiere Pro Project Panel
2. Right-click clip → Edit Metadata
3. Verify fields in PP Metadata panel:
   - **Name:** `kitchen-spur-switch-opening-ESTAB` (displayed name)
   - **Description:** `kitchen, spur-switch, appliances`
   - **Tape Name:** `EA001601.MOV` (original identifier)
   - **Shot:** `ESTAB`

### Pass Criteria
✅ All fields persist after reload (Step 3)
✅ ExtendScript console shows namespace separation (Step 2)
✅ Description does NOT overwrite Location/Subject (Step 3)
✅ Premiere Pro Name field shows structured naming (Step 4)

### Failure Modes
❌ **Description empty after reload** → Dublin Core block not created
❌ **Location/Subject corrupted** → XMP namespace collision (fields overwriting each other)
❌ **ExtendScript console shows errors** → XMP write failed

### Debug Steps if Failed
1. Copy ExtendScript console output
2. Copy Metadata Panel console (right-click → Debug)
3. Check `jsx/host.jsx:177-443` for namespace block manipulation
4. Verify Dublin Core block (`<rdf:Description rdf:about="" xmlns:dc="...">`)
5. Verify XMP namespace block (`<rdf:Description rdf:about="" xmlns:xmp="...">`)

---

## TEST-002: CEP Event Communication (Navigation → Metadata)

**Priority:** 🟡 MODERATE
**Risk:** Panels lose sync if broken
**Frequency:** Run after changes to event system

### Test Procedure

#### Step 1: Navigation → Metadata Sync
1. Open both panels (Navigation + Metadata)
2. Click clip in Navigation Panel
3. Verify Metadata Panel loads clip data within 200ms
4. Verify Source Monitor opens clip

#### Step 2: Rapid Click Test
1. Click 5 different clips rapidly (1 per second)
2. Verify Metadata Panel updates each time
3. Verify no lag or frozen UI
4. Verify last clicked clip is displayed

#### Step 3: Panel Reload Test
1. Close Metadata Panel
2. Reopen Metadata Panel (Window → Extensions → EAV Ingest Assistant - Metadata)
3. Click clip in Navigation Panel
4. Verify Metadata Panel loads (event listener registered on init)

### Pass Criteria
✅ Metadata Panel updates within 200ms of Navigation click
✅ Source Monitor opens clip
✅ Rapid clicks handled gracefully (no lag)
✅ Panel reload restores event communication

### Failure Modes
❌ **Metadata Panel doesn't update** → Event not dispatched or listener not registered
❌ **Source Monitor doesn't open** → ExtendScript call failed
❌ **UI freezes on rapid clicks** → Event handler blocking

---

## TEST-003: Panel State Management (Form Load/Save)

**Priority:** 🟡 MODERATE
**Risk:** Data loss if broken
**Frequency:** Run after changes to form logic

### Test Procedure

#### Step 1: Form Load
1. Click clip with existing metadata
2. Verify all fields populate correctly
3. Verify Generated Name updates live

#### Step 2: Form Edit
1. Change Location field: `kitchen` → `bathroom`
2. Verify Generated Name updates immediately
3. DO NOT save yet

#### Step 3: Navigation Away (Unsaved)
1. Click different clip
2. Verify form clears (no prompt - expected behavior)
3. Click original clip again
4. Verify fields show OLD values (not edited values)

#### Step 4: Form Save
1. Edit Location: `kitchen` → `bathroom`
2. Click "Apply to Premiere"
3. Verify green checkmark
4. Click different clip, then return
5. Verify Location shows NEW value: `bathroom`

### Pass Criteria
✅ Form loads existing metadata
✅ Generated Name updates live on edit
✅ Unsaved changes discarded on navigation
✅ Saved changes persist after navigation

### Failure Modes
❌ **Form doesn't load** → ExtendScript call failed or data parsing error
❌ **Generated Name doesn't update** → Event listener not attached
❌ **Saved changes don't persist** → XMP write failed or reload logic broken

---

## TEST-004: XMP Warm-Up Delay (Workaround)

**Priority:** 🟢 LOW
**Risk:** "EMPTY" metadata bug reproduces if removed
**Bug History:** Issue #3 (Tape Name XMP persistence) fixed with delay
**Frequency:** Run if changing `XMP_WARM_UP_DELAY` constant

### Test Procedure

#### Step 1: Baseline (With Delay)
1. Quit Premiere Pro completely
2. Reopen Premiere Pro with test project
3. Open Navigation Panel (first time in session)
4. Observe: "Waiting for XMP metadata to load..." message
5. Wait 1.5 seconds
6. Verify clips display with correct metadata (not "EMPTY")

#### Step 2: Without Delay (Reproduce Bug)
1. Edit `js/navigation-panel.js`: Set `XMP_WARM_UP_DELAY = 0`
2. Redeploy: `./deploy-navigation.sh`
3. Quit and reopen Premiere Pro
4. Open Navigation Panel
5. Observe: First clip may show "EMPTY" metadata
6. Reload panel (close + reopen)
7. Observe: Second load shows correct metadata

#### Step 3: Find Minimum Delay
1. Try different delays: 500ms, 1000ms, 1500ms, 2000ms
2. For each delay, quit Premiere Pro and test first load
3. Find minimum reliable delay (may vary by system/project size)

### Pass Criteria
✅ First load with 1.5s delay shows correct metadata
✅ Without delay, "EMPTY" bug reproduces (confirms workaround necessary)
✅ Minimum delay identified for optimization

### Failure Modes
❌ **Delay doesn't fix "EMPTY" bug** → Different root cause (XMP cache timing issue)
❌ **Delay too short** → Intermittent "EMPTY" failures

---

## TEST-005: Performance (100+ Clips)

**Priority:** 🟢 LOW
**Risk:** UI freeze with large projects
**Frequency:** Run after changes to clip loading or rendering

### Test Procedure

#### Step 1: Large Project Load
1. Open Premiere Pro project with 100+ clips
2. Open Navigation Panel
3. Observe load time (should be <3 seconds)
4. Verify UI responsive during load

#### Step 2: Search/Filter Performance
1. Type in search box: "kitchen"
2. Observe filter time (should be <100ms)
3. Clear search
4. Toggle "Video Only" filter
5. Observe filter time (should be <100ms)

#### Step 3: Metadata Form Performance
1. Click clip in Navigation
2. Observe form load time (should be <500ms)
3. Edit multiple fields rapidly
4. Observe Generated Name updates without lag

### Pass Criteria
✅ 100+ clips load in <3 seconds
✅ Search/filter <100ms response
✅ Form load <500ms
✅ No UI freezing

### Failure Modes
❌ **UI freezes** → ExtendScript blocking main thread
❌ **Search slow** → Filtering algorithm inefficient
❌ **Form load slow** → XMP read blocking

---

## Characterization Test Checklist

**Before ANY refactoring of proven-working code:**

- [ ] Run TEST-001 (XMP Namespace Write) - CRITICAL
- [ ] Run TEST-002 (CEP Event Communication) - MODERATE
- [ ] Run TEST-003 (Panel State Management) - MODERATE
- [ ] Document current behavior (inputs → outputs)
- [ ] Verify characterization tests pass with current code
- [ ] Commit characterization tests BEFORE refactoring
- [ ] Refactor code
- [ ] Re-run characterization tests (verify behavior unchanged)

**After refactoring:**
- [ ] All characterization tests still pass
- [ ] No new bugs introduced
- [ ] ExtendScript console shows expected output
- [ ] Premiere Pro fields correctly updated

---

## Related Documentation

- `.coord/docs/001-DOC-PROTOTYPE-LEGACY.md` → Proven working code boundary
- `.coord/adrs/001-ADR-PROTOTYPE-PRODUCTION-TRANSITION.md` → Transition strategy
- `.coord/adrs/002-ADR-TEST-INFRASTRUCTURE.md` → Test framework decision
- `CLAUDE.md` → Operational guide (console debugging)

---

**LAST UPDATED:** 2025-11-11
**OWNER:** workspace-architect
**PATTERN:** Manual test documentation + characterization protocol
