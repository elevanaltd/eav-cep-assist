# Manual Test Specification: Navigation Panel Bidirectional Sync

**Feature:** Navigation Panel should highlight the current clip when Metadata Panel uses Previous/Next buttons

**Status:** ❌ FAILING (as of 2025-11-11)

**Root Cause:** Navigation Panel does not listen to `com.elevana.clip-selected` events

---

## Test Case 1: Previous Button Syncs Navigation Panel

**Preconditions:**
1. Both panels open in Premiere Pro
2. Multiple clips in project (minimum 3)
3. No filters applied

**Steps:**
1. Click on clip #2 in Navigation Panel
2. Verify clip #2 highlighted in Navigation Panel ✓
3. Verify clip #2 metadata loaded in Metadata Panel ✓
4. Click **Previous** button in Metadata Panel
5. **Verify clip #1 is now highlighted in Navigation Panel** ❌ CURRENTLY FAILS
6. Verify clip #1 metadata loaded in Metadata Panel ✓

**Expected Result:**
- Navigation Panel highlight moves from clip #2 → clip #1
- Metadata Panel shows clip #1 data

**Current Behavior:**
- Metadata Panel updates correctly (shows clip #1)
- Navigation Panel highlight DOES NOT change (still shows clip #2)
- Creates visual mismatch between panels

---

## Test Case 2: Next Button Syncs Navigation Panel

**Preconditions:**
1. Both panels open in Premiere Pro
2. Multiple clips in project (minimum 3)
3. No filters applied

**Steps:**
1. Click on clip #2 in Navigation Panel
2. Verify clip #2 highlighted in Navigation Panel ✓
3. Verify clip #2 metadata loaded in Metadata Panel ✓
4. Click **Next** button in Metadata Panel
5. **Verify clip #3 is now highlighted in Navigation Panel** ❌ CURRENTLY FAILS
6. Verify clip #3 metadata loaded in Metadata Panel ✓

**Expected Result:**
- Navigation Panel highlight moves from clip #2 → clip #3
- Metadata Panel shows clip #3 data

**Current Behavior:**
- Metadata Panel updates correctly (shows clip #3)
- Navigation Panel highlight DOES NOT change (still shows clip #2)
- Creates visual mismatch between panels

---

## Test Case 3: Navigation Sync Respects Filters

**Preconditions:**
1. Both panels open in Premiere Pro
2. Mixed content (videos and images)
3. Apply filter: **Video Only** checked, **Image** unchecked

**Steps:**
1. Click on video clip #2 in Navigation Panel (filtered list)
2. Verify clip #2 highlighted in Navigation Panel ✓
3. Click **Next** button in Metadata Panel
4. **Verify video clip #3 is now highlighted in Navigation Panel** ❌ CURRENTLY FAILS
5. Verify navigation skips image clips (respects filter)

**Expected Result:**
- Navigation Panel highlight moves to next VIDEO clip in filtered list
- Images are skipped

**Current Behavior:**
- Metadata Panel navigates correctly through filtered list
- Navigation Panel highlight DOES NOT update

---

## Test Case 4: No Infinite Event Loops

**Preconditions:**
1. Both panels open with debug panels visible
2. Multiple clips in project

**Steps:**
1. Click on clip #2 in Navigation Panel
2. Watch debug output for event dispatch count
3. Click **Next** button in Metadata Panel
4. **Verify only ONE `com.elevana.clip-selected` event dispatched**
5. **Verify Navigation Panel does NOT re-dispatch the event**

**Expected Result:**
- Metadata Panel dispatches event
- Navigation Panel receives and updates UI
- No secondary dispatch from Navigation Panel (no loop)

**Current Behavior:**
- Metadata Panel dispatches event ✓
- Navigation Panel does NOT receive event ✗

---

## Test Case 5: Source Monitor Opens Only Once

**Preconditions:**
1. Both panels open
2. Source Monitor visible

**Steps:**
1. Click on clip #1 in Navigation Panel
2. Verify Source Monitor opens clip #1 ✓
3. Click **Next** button in Metadata Panel
4. **Verify Source Monitor updates to clip #2 (single update)**

**Expected Result:**
- Source Monitor updates once (not twice)
- No double-open flicker

**Implementation Note:**
- Navigation Panel `selectClip()` opens Source Monitor (user click)
- Navigation Panel `syncSelection()` should NOT open Source Monitor (event sync)

---

## Verification Protocol

### RED Phase (Current State):
```
1. Open Premiere Pro with both panels
2. Run Test Case 1
3. Observe: Metadata Panel Previous/Next works
4. Observe: Navigation Panel highlight DOES NOT sync
5. Check Debug Panel: "Received CEP clip-selected event" - NOT PRESENT in Navigation Panel
6. Conclusion: TEST FAILS ✗
```

### GREEN Phase (After Implementation):
```
1. Open Premiere Pro with both panels
2. Run Test Case 1
3. Observe: Metadata Panel Previous/Next works
4. Observe: Navigation Panel highlight SYNCS correctly
5. Check Debug Panel: "[ClipBrowser] ✓ Synced selection: clip-name" - PRESENT
6. Conclusion: TEST PASSES ✓
```

---

## Implementation Requirements

### Navigation Panel Changes Required:

1. **Add CEP Event Listener** (navigation-panel.js)
   ```javascript
   csInterface.addEventListener("com.elevana.clip-selected", function(event) {
       // Parse event data
       // Call syncSelection() instead of selectClip()
   });
   ```

2. **Create syncSelection() Method**
   ```javascript
   syncSelection: function(nodeId) {
       // Update PanelState.currentClip
       // Update PanelState.currentClipIndex
       // Call render() to update UI
       // Do NOT call openInSourceMonitor()
       // Do NOT dispatch event (prevent loop)
   }
   ```

3. **Debug Logging**
   ```javascript
   addDebug('[ClipBrowser] ✓ Synced selection: ' + clip.name);
   ```

### No Changes Required:
- Metadata Panel (already dispatches events correctly)
- ExtendScript layer (no changes needed)
- Event schema (reusing existing `com.elevana.clip-selected`)

---

## Acceptance Criteria

- [ ] Test Case 1: Previous button syncs Navigation Panel highlight
- [ ] Test Case 2: Next button syncs Navigation Panel highlight
- [ ] Test Case 3: Navigation respects active filters
- [ ] Test Case 4: No infinite event loops detected in debug
- [ ] Test Case 5: Source Monitor opens only once (no flicker)
- [ ] Debug panel shows sync confirmation message
- [ ] No regressions in existing Navigation Panel click behavior

---

## Test Evidence (RED Phase)

**Date:** 2025-11-11
**Tester:** Implementation Lead
**Result:** ❌ ALL TESTS FAIL

**Debug Output (Before Implementation):**
```
Navigation Panel Debug:
[ClipBrowser] ✓ Selected: clip-002 (index: 1/152)
[ClipBrowser] ✓ CEP event dispatched (index: 1/152)
[ClipBrowser] ✓ Opened in Source Monitor

<NO LISTENER FOR INCOMING EVENTS>

Metadata Panel Debug:
[MetadataForm] Received CEP clip-selected event
[MetadataForm] Navigation context: 1/152
[MetadataForm] ▶ Navigating to next clip: clip-003
<event dispatched>

Navigation Panel Debug:
<NO RESPONSE - highlight remains on clip-002>
```

**Conclusion:** Navigation Panel does not listen to CEP events dispatched by Metadata Panel. Implementation required.
