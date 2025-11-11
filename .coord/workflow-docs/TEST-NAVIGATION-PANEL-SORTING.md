# Manual Test Specification: Navigation Panel Sorting

**Feature:** Navigation Panel should support multiple sort options including alphabetical and bin-based grouping

**Status:** ❌ FAILING (as of 2025-11-11)

**Root Cause:** No sort dropdown exists; clips display in project tree traversal order only

---

## Test Case 1: Sort Dropdown Exists

**Preconditions:**
1. Navigation Panel open in Premiere Pro

**Steps:**
1. Look for sort dropdown in Navigation Panel UI
2. **Verify dropdown exists with label "Sort:"** ❌ CURRENTLY FAILS
3. **Verify dropdown has options:**
   - Name (A-Z)
   - Name (Z-A)
   - By Bin

**Expected Result:**
- Sort dropdown visible between filters and clip list
- Default selection: "By Bin"

**Current Behavior:**
- No sort dropdown exists
- Clips display in project tree traversal order

---

## Test Case 2: Alphabetical Sort (A-Z)

**Preconditions:**
1. Navigation Panel open with 10+ clips
2. Sort dropdown exists

**Steps:**
1. Select "Name (A-Z)" from sort dropdown
2. **Verify clips appear in alphabetical order** ❌ CURRENTLY FAILS
3. Verify first clip starts with 'A' or lowest character
4. Verify last clip starts with 'Z' or highest character

**Expected Result:**
```
• bathroom-mirror-CU
• bathroom-shower-MID
• kitchen-fridge-ESTAB
• kitchen-oven-WS
• kitchen-sink-CU
• living-sofa-WS
```

**Current Behavior:**
- No sorting available
- Clips appear in project tree order

---

## Test Case 3: Alphabetical Sort (Z-A)

**Preconditions:**
1. Navigation Panel open with 10+ clips
2. Sort dropdown exists

**Steps:**
1. Select "Name (Z-A)" from sort dropdown
2. **Verify clips appear in reverse alphabetical order** ❌ CURRENTLY FAILS
3. Verify first clip starts with 'Z' or highest character
4. Verify last clip starts with 'A' or lowest character

**Expected Result:**
```
• living-sofa-WS
• kitchen-sink-CU
• kitchen-oven-WS
• kitchen-fridge-ESTAB
• bathroom-shower-MID
• bathroom-mirror-CU
```

**Current Behavior:**
- No reverse sorting available

---

## Test Case 4: Bin-Based Grouping with Headers

**Preconditions:**
1. Navigation Panel open with clips in multiple bins
2. Project structure has bins like "Shoot 1/Kitchen", "Shoot 1/Bathroom"
3. Sort dropdown exists

**Steps:**
1. Select "By Bin" from sort dropdown
2. **Verify bin headers appear with folder icon** ❌ CURRENTLY FAILS
3. **Verify clips are grouped under their bins** ❌ CURRENTLY FAILS
4. **Verify clips are indented under bin headers** ❌ CURRENTLY FAILS
5. Verify bin header shows last segment only (e.g., "Kitchen" not full path)

**Expected Result:**
```
📁 Bathroom
  • bathroom-mirror-CU
  • bathroom-shower-MID
📁 Kitchen
  • kitchen-fridge-ESTAB
  • kitchen-oven-WS
  • kitchen-sink-CU
📁 Living Room
  • living-sofa-WS
```

**Visual Treatment:**
- Bin headers: Bold, darker background, folder icon
- Clips: Indented 32px under their bin
- Bins sorted alphabetically

**Current Behavior:**
- No bin headers exist
- No visual grouping
- Clips displayed flat in tree traversal order

---

## Test Case 5: Sort Persists Selection

**Preconditions:**
1. Navigation Panel open with clips
2. Sort dropdown exists
3. Clip selected (highlighted)

**Steps:**
1. Click on "kitchen-fridge-ESTAB" in Navigation Panel
2. Verify clip is highlighted and loaded in Metadata Panel
3. Change sort from "By Bin" to "Name (A-Z)"
4. **Verify "kitchen-fridge-ESTAB" remains highlighted** ❌ CURRENTLY FAILS
5. Verify Metadata Panel still shows correct clip data

**Expected Result:**
- Selected clip remains selected after re-sort
- Highlight moves to new position in sorted list
- Metadata Panel unchanged

**Current Behavior:**
- Cannot test (no sort dropdown)

---

## Test Case 6: Sort Works with Search Filter

**Preconditions:**
1. Navigation Panel open with 20+ clips
2. Sort dropdown exists

**Steps:**
1. Type "kitchen" in search box
2. Verify only kitchen clips visible (filtered)
3. Select "Name (A-Z)" from sort dropdown
4. **Verify filtered clips are sorted alphabetically** ❌ CURRENTLY FAILS
5. Verify non-matching clips are hidden

**Expected Result:**
```
Search: "kitchen"
Sort: Name (A-Z)

• kitchen-fridge-ESTAB
• kitchen-oven-WS
• kitchen-sink-CU
```

**Current Behavior:**
- Search works ✓
- No sorting applied to filtered results ✗

---

## Test Case 7: Sort Works with Type Filters

**Preconditions:**
1. Navigation Panel open with mixed videos and images
2. Sort dropdown exists

**Steps:**
1. Uncheck "Image" filter (show videos only)
2. Select "Name (A-Z)" from sort dropdown
3. **Verify only videos are shown, sorted alphabetically** ❌ CURRENTLY FAILS
4. Change sort to "By Bin"
5. **Verify videos grouped by bin, images still hidden** ❌ CURRENTLY FAILS

**Expected Result:**
- Sorting applies to filtered results
- Type filters remain effective
- Both work together seamlessly

**Current Behavior:**
- Type filters work ✓
- No sorting available ✗

---

## Test Case 8: Bin Grouping Handles Clips Without Bins

**Preconditions:**
1. Navigation Panel open
2. Project has some clips with no bin (treePath empty/null)
3. Sort dropdown exists

**Steps:**
1. Select "By Bin" from sort dropdown
2. **Verify clips without treePath appear in "Uncategorized" bin** ❌ CURRENTLY FAILS
3. Verify "Uncategorized" bin appears at appropriate position (alphabetical)

**Expected Result:**
```
📁 Kitchen
  • kitchen-fridge-ESTAB
📁 Uncategorized
  • loose-clip-001.mov
  • random-footage.mov
```

**Current Behavior:**
- Cannot test (no bin grouping)

---

## Test Case 9: Sort State Persists Across Actions

**Preconditions:**
1. Navigation Panel open
2. Sort dropdown exists

**Steps:**
1. Change sort to "Name (A-Z)"
2. Verify clips sorted alphabetically
3. Click "Refresh" button
4. **Verify sort remains "Name (A-Z)"** ❌ CURRENTLY FAILS
5. **Verify clips still sorted alphabetically after refresh** ❌ CURRENTLY FAILS

**Expected Result:**
- Sort preference persists during session
- Re-render maintains sort order

**Current Behavior:**
- Cannot test (no sort dropdown)

---

## Test Case 10: Bin Header Visual Styling

**Preconditions:**
1. Navigation Panel open with "By Bin" sort selected
2. Bin headers visible

**Steps:**
1. Observe bin header styling
2. **Verify folder icon (📁) appears before bin name** ❌ CURRENTLY FAILS
3. **Verify bin header has darker background** ❌ CURRENTLY FAILS
4. **Verify bin header has left border accent** ❌ CURRENTLY FAILS
5. **Verify bin name is bold** ❌ CURRENTLY FAILS
6. Observe clip indentation
7. **Verify clips indented 32px under bins** ❌ CURRENTLY FAILS

**Expected Visual:**
- Bin Header: `background: #3a3a3a`, `border-left: 3px solid #0078d4`, `font-weight: bold`
- Clips: `padding-left: 32px`

**Current Behavior:**
- No bin headers exist
- All clips have uniform styling

---

## Verification Protocol

### RED Phase (Current State):
```
1. Open Premiere Pro with Navigation Panel
2. Look for sort dropdown between filters and clip list
3. Observe: NO DROPDOWN EXISTS
4. Observe: Clips display in project tree order
5. Conclusion: TEST FAILS ✗
```

### GREEN Phase (After Implementation):
```
1. Open Premiere Pro with Navigation Panel
2. Verify sort dropdown exists with 3 options
3. Test "Name (A-Z)": Clips appear alphabetically
4. Test "Name (Z-A)": Clips appear in reverse order
5. Test "By Bin": Bin headers appear with grouped clips
6. Test with filters: Sort + search/type filters work together
7. Test selection persistence: Selected clip remains highlighted after sort
8. Conclusion: ALL TESTS PASS ✓
```

---

## Implementation Requirements

### Navigation Panel Changes Required:

1. **HTML Changes** (index-navigation.html)
   ```html
   <div class="sort-row">
       <label for="sortBy">Sort:</label>
       <select id="sortBy" class="sort-dropdown">
           <option value="name">Name (A-Z)</option>
           <option value="name-desc">Name (Z-A)</option>
           <option value="bin" selected>By Bin</option>
       </select>
   </div>
   ```

2. **JavaScript Changes** (js/navigation-panel.js)
   ```javascript
   // Add to PanelState
   sortBy: 'bin'

   // Add methods
   sortClips: function(clips) { ... }
   groupByBin: function(clips) { ... }

   // Update render() to handle bin headers
   // Add sort dropdown event listener
   ```

3. **CSS Changes** (css/navigation-panel.css)
   ```css
   .sort-row { ... }
   .sort-dropdown { ... }
   .bin-header { ... }
   .clip-item.in-bin { padding-left: 32px; }
   ```

---

## Acceptance Criteria

- [ ] Test Case 1: Sort dropdown exists with 3 options
- [ ] Test Case 2: Name (A-Z) sorts alphabetically
- [ ] Test Case 3: Name (Z-A) sorts reverse alphabetically
- [ ] Test Case 4: By Bin shows headers and groups clips
- [ ] Test Case 5: Sort preserves selection
- [ ] Test Case 6: Sort works with search filter
- [ ] Test Case 7: Sort works with type filters
- [ ] Test Case 8: Bin grouping handles uncategorized clips
- [ ] Test Case 9: Sort state persists across refresh
- [ ] Test Case 10: Bin headers have correct visual styling

---

## Test Evidence (RED Phase)

**Date:** 2025-11-11
**Tester:** Implementation Lead
**Result:** ❌ ALL TESTS FAIL

**Current UI State:**
```
┌─────────────────────────────────────┐
│  EAV Ingest Assistant - Navigation  │
├─────────────────────────────────────┤
│  [Search clips...]            [×]   │
│  ☑ Video  ☑ Image  ☐ Tagged        │
│  <NO SORT DROPDOWN>                 │  ← MISSING
├─────────────────────────────────────┤
│  • EA001599.MOV                     │
│  • kitchen-fridge-ESTAB             │
│  • bathroom-shower-MID              │
│  • EA001600.MOV                     │
│  (unsorted - tree traversal order)  │
└─────────────────────────────────────┘
```

**Debug Output (Before Implementation):**
```
[ClipBrowser] ✓ Loaded 152 clips
<no sort applied - displayed in allClips array order>
```

**Conclusion:** No sort functionality exists. Implementation required.
