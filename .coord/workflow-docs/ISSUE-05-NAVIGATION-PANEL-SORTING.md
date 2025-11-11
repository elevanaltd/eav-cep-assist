# Issue #5: Navigation Panel Sorting

**Status:** Pending (User testing Issue #3 first)
**Priority:** Enhancement
**Component:** Navigation Panel
**Complexity:** Medium

---

## Problem Statement

**Current State:**
- Navigation panel displays clips in **project tree traversal order** (Premiere Pro's internal structure order)
- No explicit sorting applied
- Bin structure is captured in `treePath` property (e.g., `"Project/Footage/Shoot 1/Kitchen"`) but not used for sorting/display
- Only filters available: Video/Image/Tagged/Search
- If clips appear in date order, it's coincidental (how Premiere Pro stores them internally)

**User Need:**
- Ability to sort clips for better organization and navigation
- Support for bin-based workflow (e.g., "Shoot 1", "Shoot 2", "Kitchen", "Bathroom")
- Multiple sorting strategies for different use cases

---

## Proposed Sorting Options

### **Option 1: Alphabetical Sort (A-Z)**
**Description:** Sort clips alphabetically by clip name
**Use Case:** Finding specific clips quickly by name
**Implementation:** Simple string sort on `clip.name`

**Example:**
```
• EA001599.MOV
• EA001600.MOV
• kitchen-fridge-ESTAB
• kitchen-wine-cooler-ESTAB
```

---

### **Option 2: Bin-Based Grouping** ⭐ **RECOMMENDED**
**Description:** Group clips by bin structure, maintaining project organization
**Use Case:** Best for organized shoots with "Shoot 1", "Shoot 2", location-based bins
**Implementation:** Parse `treePath`, group by parent bin, sort bins alphabetically

**Example:**
```
📁 Shoot 1 / Kitchen
  • kitchen-fridge-ESTAB
  • kitchen-sink-CU
  • kitchen-oven-WS

📁 Shoot 1 / Bathroom
  • bathroom-shower-MID
  • bathroom-mirror-CU

📁 Shoot 2 / Exterior
  • exterior-entrance-ESTAB
  • exterior-parking-WS
```

**Visual Treatment:**
- Add bin header row with folder icon
- Indent clips under their bin
- Collapse/expand bins (optional future enhancement)

---

### **Option 3: Bin Name + Alphabetical Within Bins**
**Description:** Keep bin grouping but sort clips alphabetically within each bin
**Use Case:** Organized projects where you want both structure and alphabetical order
**Implementation:** Group by bin, then sort clips A-Z within each group

**Example:**
```
📁 Kitchen
  • EA001599.MOV
  • EA001600.MOV
  • kitchen-fridge-ESTAB

📁 Living Room
  • EA001605.MOV
  • living-sofa-WS
```

---

### **Option 4: Multiple Sort Options with Dropdown** ⭐ **FULL SOLUTION**
**Description:** Add sort dropdown in Navigation Panel UI
**Use Case:** Flexible sorting for different workflows
**Implementation:** Dropdown with multiple sort strategies

**Sort Options:**
1. **Name (A-Z)** - Alphabetical by clip name
2. **Name (Z-A)** - Reverse alphabetical
3. **By Bin** - Bin-based grouping (Option 2)
4. **Duration (Longest First)** - Sort by clip duration
5. **Duration (Shortest First)** - Reverse duration sort
6. **File Type** - Group by video/image

**UI Mockup:**
```
┌─────────────────────────────────────┐
│  EAV Ingest Assistant - Navigation  │
├─────────────────────────────────────┤
│  [Search clips...]            [×]   │
│  ☑ Video  ☑ Image  ☐ Tagged        │
│  Sort: [By Bin ▼]                   │  ← NEW DROPDOWN
├─────────────────────────────────────┤
│  📁 Shoot 1 / Kitchen               │  ← BIN HEADER
│    • kitchen-fridge-ESTAB           │
│    • kitchen-sink-CU                │
│  📁 Shoot 1 / Bathroom              │
│    • bathroom-shower-MID            │
├─────────────────────────────────────┤
│  DIAGNOSTICS              [CLEAR]   │
│  [Debug logs...]                    │
└─────────────────────────────────────┘
```

---

## Technical Implementation Plan

### **1. Data Structure Analysis**

**Current Clip Object:**
```javascript
{
    nodeId: "000f426c",
    name: "kitchen-fridge-ESTAB",
    treePath: "Project/Footage/Shoot 1/Kitchen",  // ← KEY PROPERTY
    mediaPath: "/path/to/EA001599.MOV",
    identifier: "identifier",
    description: "bosch, integrated, freezer-drawer...",
    shot: "ESTAB"
}
```

**Key Property:** `treePath` contains full bin path from project root

---

### **2. Sort Implementation Approach**

**Add Sort State to PanelState:**
```javascript
var PanelState = {
    allClips: [],
    currentClip: null,
    searchQuery: '',
    filterVideo: true,
    filterImage: true,
    filterHasMeta: false,
    sortBy: 'bin'  // NEW: 'name', 'name-desc', 'bin', 'duration', 'duration-desc', 'type'
};
```

**Add Sort Function:**
```javascript
sortClips: function() {
    var clips = PanelState.allClips.slice(); // Copy array

    switch (PanelState.sortBy) {
        case 'name':
            clips.sort(function(a, b) { return a.name.localeCompare(b.name); });
            break;
        case 'name-desc':
            clips.sort(function(a, b) { return b.name.localeCompare(a.name); });
            break;
        case 'bin':
            clips = this.groupByBin(clips);
            break;
        case 'duration':
            // Would need duration field from ExtendScript
            break;
        case 'type':
            clips.sort(function(a, b) {
                var aType = a.mediaPath.match(/\.(mov|mp4|mxf|avi)$/i) ? 'video' : 'image';
                var bType = b.mediaPath.match(/\.(mov|mp4|mxf|avi)$/i) ? 'video' : 'image';
                return aType.localeCompare(bType);
            });
            break;
    }

    return clips;
},

groupByBin: function(clips) {
    // Group clips by treePath
    var grouped = {};
    clips.forEach(function(clip) {
        var binPath = clip.treePath || 'Uncategorized';
        if (!grouped[binPath]) grouped[binPath] = [];
        grouped[binPath].push(clip);
    });

    // Sort bins alphabetically
    var sortedBins = Object.keys(grouped).sort();

    // Flatten back to array with bin headers
    var result = [];
    sortedBins.forEach(function(binPath) {
        result.push({ isBinHeader: true, binPath: binPath }); // Add bin header
        grouped[binPath].forEach(function(clip) {
            result.push(clip);
        });
    });

    return result;
}
```

---

### **3. UI Changes**

**Add Sort Dropdown to HTML:**
```html
<!-- Navigation Panel - index-navigation.html -->
<div class="filter-section">
    <div class="filter-row">
        <!-- Existing filters -->
        <label class="filter-checkbox">
            <input type="checkbox" id="filterVideo" checked> Video
        </label>
        <!-- ... other filters ... -->
    </div>

    <!-- NEW: Sort dropdown -->
    <div class="sort-row">
        <label for="sortBy">Sort:</label>
        <select id="sortBy" class="sort-dropdown">
            <option value="name">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="bin" selected>By Bin</option>
            <option value="duration">Duration (Longest)</option>
            <option value="duration-desc">Duration (Shortest)</option>
            <option value="type">File Type</option>
        </select>
    </div>
</div>
```

**Add CSS Styling:**
```css
.sort-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 4px 0;
}

.sort-row label {
    font-size: 11px;
    color: #ccc;
}

.sort-dropdown {
    flex: 1;
    padding: 4px 8px;
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    border-radius: 3px;
    font-size: 11px;
}

.bin-header {
    padding: 8px 12px;
    background: #3a3a3a;
    border-left: 3px solid #0078d4;
    font-weight: bold;
    color: #e0e0e0;
    cursor: pointer;
    user-select: none;
}

.bin-header::before {
    content: '📁 ';
    margin-right: 6px;
}

.clip-item.in-bin {
    padding-left: 32px; /* Indent clips under bins */
}
```

---

### **4. Render Changes**

**Update render() to handle bin headers:**
```javascript
render: function() {
    var filteredClips = this.getFilteredClips();
    var sortedClips = this.sortClips(filteredClips);

    var html = sortedClips.map(function(item) {
        // Check if this is a bin header
        if (item.isBinHeader) {
            return '<div class="bin-header" data-bin-path="' + item.binPath + '">' +
                   item.binPath.split('/').pop() + // Show only last part of path
                   '</div>';
        }

        // Regular clip item (add in-bin class if preceded by bin header)
        var clip = item;
        if (!clip.nodeId) return '';

        var isSelected = PanelState.currentClip && clip.nodeId === PanelState.currentClip.nodeId;
        var hasMetadata = clip.shot || clip.description || clip.identifier;
        var statusIcon = hasMetadata ? '✓' : '•';
        var statusClass = hasMetadata ? 'tagged' : 'untagged';

        return '<div class="clip-item in-bin' + (isSelected ? ' selected' : '') + '" ' +
               'data-clip-id="' + clip.nodeId + '" ' +
               'role="listitem" tabindex="0">' +
               '<span class="status-icon ' + statusClass + '">' + statusIcon + '</span>' +
               '<span class="clip-name">' + clip.name + '</span>' +
               '</div>';
    }).join('');

    this.elements.clipList.innerHTML = html;
}
```

---

### **5. Event Handling**

**Add Sort Dropdown Change Listener:**
```javascript
init: function() {
    // ... existing init code ...

    // NEW: Sort dropdown listener
    var sortDropdown = document.getElementById('sortBy');
    sortDropdown.addEventListener('change', function() {
        PanelState.sortBy = sortDropdown.value;
        addDebug('[ClipBrowser] Sort changed to: ' + PanelState.sortBy);
        self.render();
    });
}
```

---

## Files to Modify

1. **`index-navigation.html`**
   - Add sort dropdown UI
   - Add bin header HTML structure

2. **`js/navigation-panel.js`**
   - Add `sortBy` to PanelState
   - Add `sortClips()` function
   - Add `groupByBin()` function
   - Update `render()` to handle bin headers
   - Add sort dropdown event listener

3. **`css/navigation-panel.css`**
   - Add `.sort-row` styling
   - Add `.sort-dropdown` styling
   - Add `.bin-header` styling
   - Add `.clip-item.in-bin` indentation

4. **`jsx/host.jsx` (Optional - if adding duration sort)**
   - Add duration field to clip data in `getAllProjectClips()`
   - Use `item.getOutPoint().seconds` for duration

---

## Testing Plan

**Test Cases:**

1. **Name (A-Z) Sort**
   - Change sort to "Name (A-Z)"
   - Verify clips appear alphabetically
   - Verify search filter still works
   - Verify selection persists

2. **Name (Z-A) Sort**
   - Change sort to "Name (Z-A)"
   - Verify reverse alphabetical order

3. **By Bin Sort**
   - Change sort to "By Bin"
   - Verify bin headers appear
   - Verify clips are grouped under correct bins
   - Verify bin headers show last segment of treePath (e.g., "Kitchen" not full path)
   - Verify clips are indented under bins

4. **File Type Sort**
   - Change sort to "File Type"
   - Verify videos grouped together
   - Verify images grouped together

5. **Persistence**
   - Select a clip
   - Change sort order
   - Verify selected clip remains selected
   - Verify selection scrolls into view

6. **Edge Cases**
   - Clips with no bin (treePath empty) → should go to "Uncategorized" bin
   - Search + Sort combination → both should work together
   - Filter + Sort combination → both should work together

---

## Recommended Implementation Order

**Phase 1: Basic Alphabetical Sort (Quick Win)**
- Add sort dropdown with just "Name (A-Z)" and "Name (Z-A)"
- Implement basic string sort
- Test with real project

**Phase 2: Bin-Based Grouping (High Value)**
- Add "By Bin" option
- Implement `groupByBin()` function
- Add bin header rendering
- Add CSS for bin headers and indentation

**Phase 3: Additional Sorts (Nice to Have)**
- Add duration sort (requires ExtendScript changes)
- Add file type sort
- Add collapse/expand bins (future enhancement)

---

## User Stories

**As a video editor, I want to:**
1. See clips organized by shoot/location bins so I can find footage by where it was shot
2. Sort clips alphabetically so I can quickly find a specific clip by name
3. Sort by duration so I can find the longest/shortest clips in my project
4. Group videos and images separately so I can focus on one media type

---

## Dependencies

**Required:**
- `treePath` property already exists in clip data ✅
- No ExtendScript changes needed for basic sorting ✅

**Optional (for duration sort):**
- Add `duration` field to `getAllProjectClips()` in jsx/host.jsx
- Use `item.getOutPoint().seconds` or `item.getDuration()`

---

## Success Criteria

✅ User can select sort order from dropdown
✅ Clips re-render immediately when sort changes
✅ Bin-based sort shows clear visual hierarchy
✅ Selected clip remains selected after re-sort
✅ Sort works with search and filter combinations
✅ Performance acceptable with 150+ clips

---

## Notes

- **Default Sort:** Recommend "By Bin" as default (matches user's organized workflow)
- **Performance:** With 150 clips, JavaScript sort should be instant (<50ms)
- **Future Enhancement:** Add collapse/expand for bin headers
- **Accessibility:** Ensure keyboard navigation works with bin headers

---

**Ready to implement when Issue #3 testing complete.**
