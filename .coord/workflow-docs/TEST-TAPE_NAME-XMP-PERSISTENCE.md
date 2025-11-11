# Test Protocol: Tape Name XMP Persistence

**Test ID:** TAPE_NAME_001
**Type:** Integration Test (Manual Verification)
**Phase:** RED → GREEN → REFACTOR
**Created:** 2025-11-11

---

## Test Objective

Verify that Tape Name value persists to XMP metadata and survives:
1. Panel reload
2. Premiere Pro restart
3. Reading from different clips

---

## Pre-Test State (RED - Expected FAIL)

### Current Behavior:
- **Read:** `jsx/host.jsx:341-343` tries to read `<xmp:TapeName>` from XMP
- **Write:** `jsx/host.jsx:183-186` explicitly SKIPS tapeName writing (see comment)
- **Fallback:** `js/metadata-panel.js:172` falls back to `clip.name` (filename)

### Expected Failure Symptoms:
1. ✗ Identifier field always shows original filename
2. ✗ ExtendScript logs show NO "TapeName updated to XMP" message
3. ✗ Reloading panel shows filename again (not persisted value)

---

## Test Steps

### Setup:
1. Deploy both panels: `./deploy-navigation.sh && ./deploy-metadata.sh`
2. Open Premiere Pro with test project
3. Open ExtendScript Toolkit to monitor debug logs
4. Open both CEP panels (Navigation + Metadata)

### Test Execution:

**Step 1: Verify Current State (RED)**
- [ ] Click clip in Navigation panel
- [ ] Check Metadata panel Identifier field
- [ ] Verify it shows original filename (e.g., "20240815-kitchen-oven-cleaning-WS.mov")
- [ ] Check ExtendScript logs - should see "tapeName: ''" (empty from XMP)
- [ ] **Expected:** Identifier = filename (no XMP TapeName found)

**Step 2: Trigger Metadata Save**
- [ ] Edit Description field: "Test description for XMP persistence"
- [ ] Click "Apply to Premiere"
- [ ] Check ExtendScript logs for "DEBUG SAVE: XMP metadata updated"
- [ ] Verify logs do NOT show "TapeName updated" (proving it's not being written)
- [ ] **Expected RED:** No TapeName write confirmation in logs

**Step 3: Verify Persistence Failure (RED)**
- [ ] Reload Metadata Panel (Window → Extensions → close/reopen)
- [ ] Click same clip again in Navigation panel
- [ ] Check Identifier field - should still show filename
- [ ] Check ExtendScript logs - should still see "tapeName: ''" (empty)
- [ ] **Expected RED:** TapeName did not persist to XMP

---

## Post-Implementation Tests (GREEN - Expected PASS)

After implementing XMP write for tapeName:

**Step 4: Verify XMP Write Implementation**
- [ ] Click clip in Navigation panel
- [ ] Identifier shows filename initially (first time, no XMP yet)
- [ ] Edit Description: "Testing TapeName persistence"
- [ ] Click "Apply to Premiere"
- [ ] Check ExtendScript logs - MUST see:
   ```
   DEBUG SAVE: Got XMP (length: XXXX)
   DEBUG SAVE: TapeName updated to XMP: '20240815-kitchen-oven-cleaning-WS.mov'
   DEBUG SAVE: XMP metadata updated
   ```
- [ ] **Expected GREEN:** TapeName write confirmed in logs

**Step 5: Verify Persistence (GREEN)**
- [ ] Reload Metadata Panel
- [ ] Click same clip again
- [ ] Check ExtendScript logs - MUST see:
   ```
   DEBUG FINAL XMP VALUES for [clip]:
     tapeName: '20240815-kitchen-oven-cleaning-WS.mov'
   ```
- [ ] Identifier field shows persisted tapeName value (not fallback)
- [ ] **Expected GREEN:** TapeName read from XMP successfully

**Step 6: Verify Cross-Clip Isolation (GREEN)**
- [ ] Click different clip in Navigation panel
- [ ] Verify new clip's Identifier shows its own filename/tapeName
- [ ] Edit Description and save
- [ ] Click back to first clip
- [ ] Verify first clip's Identifier still shows correct tapeName
- [ ] **Expected GREEN:** Each clip maintains its own TapeName in XMP

---

## Pass Criteria (Definition of GREEN)

✓ **Must Have:**
1. ExtendScript logs show "TapeName updated to XMP: [value]" on save
2. Panel reload shows persisted tapeName (not filename fallback)
3. Each clip maintains independent tapeName values in XMP
4. No XMP corruption (Description, Good, Shot fields still work)

✓ **Evidence Required:**
- Screenshots of ExtendScript logs showing TapeName write/read
- Before/After comparison of Identifier field values
- Verification that other XMP fields (Description) unaffected

---

## Known Limitations

- **Read-only field:** Identifier (tapeName) is readonly in UI, populated from clip.name or clip.tapeName
- **Not user-editable:** Users cannot manually set tapeName via panel (by design)
- **Automatic population:** tapeName always reflects clip.name at load time

---

## Refactor Opportunities (Post-GREEN)

After achieving GREEN:
- [ ] Consider consolidating XMP write logic into helper function (DRY)
- [ ] Add XMP namespace validation
- [ ] Consider error handling for malformed XMP

---

## Test Status

- [ ] RED phase verified (current state)
- [ ] Implementation complete
- [ ] GREEN phase verified (post-implementation)
- [ ] Evidence artifacts collected
