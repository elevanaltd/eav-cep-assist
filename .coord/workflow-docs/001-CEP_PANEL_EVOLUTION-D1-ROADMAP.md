# CEP Panel Evolution Roadmap: Prototype → Production Trial

## EXECUTIVE SUMMARY

**Approach:** Iterate on working prototype through evidence-based refinement

**Strategy:** COMPLETION_THROUGH_SUBTRACTION + EMPIRICAL_DEVELOPMENT
- Remove thumbnail viewer (non-essential, layout constraint)
- Two-panel architecture: Navigation (separate) | Metadata (primary)
- Fix metadata save (broken baseline functionality)
- Add minimal production features (shoot grouping, Good checkbox)
- Deploy for team trial (1-2 editors, 1 week)
- Evidence-driven next decision (iterate vs. rebuild)

**Timeline:** 6-8 days development + 1 week trial = 13-15 days total

**Success Criteria:**
- Editors can navigate clips ✓
- Editors can update metadata and save to PP ✓
- Editors can group by shoot ✓
- Editors can filter "Good" clips ✓
- Real usage reveals actual requirements ✓

---

## PHASE 0: ARCHITECTURAL FOUNDATION (4-6 hours)

### Objective

Create clean two-panel architecture by removing thumbnail viewer and restructuring layout.

### Rationale

- **Layout Constraint:** Navigation needs separate panel (user requirement)
- **COMPLETION_THROUGH_SUBTRACTION:** Thumbnail viewer unused, removal simplifies
- **Clean Foundation:** Two-panel structure easier to maintain than three-panel

### Tasks

#### 0.1: Remove Thumbnail Viewer Component (1 hour)
```javascript
// File: js/panel-main.js
// Remove entire ThumbnailViewer object (lines ~450-600)
// DELETE:
var ThumbnailViewer = {
    // ... entire component
};
```

#### 0.2: Update HTML Layout (2 hours)
```html
<!-- File: index.html -->
<!-- BEFORE: Three-panel grid -->
<div class="panel-container">
    <aside class="clip-browser">...</aside>  <!-- 25% -->
    <div class="right-panel-container">      <!-- 75% -->
        <main class="thumbnail-viewer">...</main>     <!-- Remove this -->
        <section class="metadata-form">...</section>
    </div>
</div>

<!-- AFTER: Two-panel grid -->
<div class="panel-container">
    <aside class="navigation-panel">...</aside>     <!-- 40% -->
    <main class="metadata-panel">...</main>         <!-- 60% -->
</div>
```

#### 0.3: Update CSS for Two-Panel Layout (1 hour)
```css
/* File: css/panel-layout.css (or create if inline) */
.panel-container {
    display: grid;
    grid-template-columns: 40% 60%;  /* Navigation | Metadata */
    height: 100vh;
    gap: 1px;
    background: #3a3a3a;  /* Gap color */
}

.navigation-panel {
    display: flex;
    flex-direction: column;
    background: #2b2b2b;
    border-right: 1px solid #3a3a3a;
}

.metadata-panel {
    display: flex;
    flex-direction: column;
    background: #2b2b2b;
    padding: 16px;
}
```

#### 0.4: Update Component Initialization (30 min)
```javascript
// File: js/panel-main.js
function init() {
    addDiagnostic('[Panel] Initializing Components...');

    // Initialize ClipBrowser (Navigation)
    ClipBrowser.init();
    addDiagnostic('[ClipBrowser] ✓ Initialized');

    // Initialize MetadataForm (no thumbnail dependency)
    MetadataForm.init();
    addDiagnostic('[MetadataForm] ✓ Initialized');

    // REMOVE: ThumbnailViewer.init() - no longer exists

    addDiagnostic('[Panel] ✓ All components initialized');
}
```

#### 0.5: Update Event Flow (30 min)
```javascript
// OLD FLOW: ClipBrowser → ThumbnailViewer → MetadataForm
// NEW FLOW: ClipBrowser → MetadataForm (direct)

// In ClipBrowser.selectClip()
selectClip: function(clip, index) {
    PanelState.currentClip = clip;
    PanelState.currentClipIndex = index;

    // OLD: Dispatch event for ThumbnailViewer
    // document.dispatchEvent(new CustomEvent('clip-selected', {detail: clip}));

    // NEW: Direct MetadataForm update
    MetadataForm.loadClipData(clip);

    // Still open in Source Monitor
    this.openInSourceMonitor(clip.nodeId);
}
```

#### 0.6: Remove Diagnostic Alert (5 min)
```javascript
// File: js/panel-main.js
// Remove temporary cache-busting alert (line 7)
// DELETE: alert('✓ NEW panel-main.js loaded - Cache cleared successfully!');
```

### Quality Gates
- Panel loads without JavaScript errors
- Navigation panel displays clips
- Metadata panel displays selected clip
- No references to ThumbnailViewer in code
- Layout is 40/60 split (navigation/metadata)

### Deliverables
- Updated index.html (two-panel structure)
- Updated js/panel-main.js (ThumbnailViewer removed)
- Updated css/panel-layout.css (two-panel grid)
- Git commit: `refactor: Two-panel architecture (navigation + metadata)`

### Testing Checklist
```bash
# 1. Deploy changes
cp index.html js/panel-main.js css/panel-layout.css ~/Library/Application\ Support/Adobe/CEP/extensions/eav-cep-assist/

# 2. Restart Premiere Pro

# 3. Open EAV Ingest Assistant panel

# 4. Verify:
#    - Two panels visible (navigation left, metadata right)
#    - Clicking clip in navigation updates metadata panel
#    - No console errors
#    - Source Monitor opens on clip select
```

---

## PHASE 1: FIX METADATA SAVE (6-8 hours)

### Objective

Connect MetadataForm UI to ExtendScript updateClipMetadata() function so editors can save metadata changes to Premiere Pro.

### Current State Analysis

```javascript
// WHAT WORKS:
- ExtendScript: EAVIngest.updateClipMetadata(nodeId, metadata) exists
- MetadataForm UI: Input fields present (location, subject, action, shotType)
- ClipBrowser: Loads clips from PP successfully

// WHAT'S BROKEN:
- MetadataForm: "Apply to Premiere" button doesn't call ExtendScript
- No feedback when save succeeds/fails
- No validation of field requirements
```

### Tasks

#### 1.1: Wire Up Save Button (2 hours)
```javascript
// File: js/panel-main.js - MetadataForm object

// Add save method
save: function() {
    var self = this;

    if (!PanelState.currentClip) {
        addDiagnostic('[MetadataForm] No clip selected', true);
        alert('No clip selected');
        return;
    }

    // Collect form values
    var metadata = {
        name: self.generateClipName(),  // {location}-{subject}-{action}-{shotType}
        tapeName: document.getElementById('metadataId').value,
        location: document.getElementById('metadataLocation').value,
        subject: document.getElementById('metadataSubject').value,
        action: document.getElementById('metadataAction').value,
        shotType: document.getElementById('metadataShotType').value
    };

    addDiagnostic('[MetadataForm] Saving: ' + metadata.name);

    // Call ExtendScript
    var nodeId = PanelState.currentClip.nodeId;
    var metadataJSON = JSON.stringify(metadata);

    csInterface.evalScript(
        'EAVIngest.updateClipMetadata("' + nodeId + '", ' + metadataJSON + ')',
        function(result) {
            var response = JSON.parse(result);

            if (response.success) {
                addDiagnostic('[MetadataForm] ✓ Saved successfully');
                alert('Metadata saved to Premiere Pro!');

                // Update local state
                PanelState.currentClip.name = metadata.name;
                PanelState.currentClip.location = metadata.location;
                PanelState.currentClip.subject = metadata.subject;
                PanelState.currentClip.action = metadata.action;
                PanelState.currentClip.shotType = metadata.shotType;

                // Refresh navigation display
                ClipBrowser.render();
            } else {
                addDiagnostic('[MetadataForm] ✗ Save failed: ' + response.error, true);
                alert('Save failed: ' + response.error);
            }
        }
    );
},

// Helper: Generate structured name
generateClipName: function() {
    var location = document.getElementById('metadataLocation').value || '';
    var subject = document.getElementById('metadataSubject').value || '';
    var action = document.getElementById('metadataAction').value || '';
    var shotType = document.getElementById('metadataShotType').value || '';

    // Build name: {location}-{subject}-{action}-{shotType}
    var parts = [location, subject, action, shotType].filter(function(p) {
        return p !== '';
    });
    return parts.join('-') || 'Untitled';
}
```

#### 1.2: Connect Button Event (30 min)
```javascript
// In MetadataForm.init()
init: function() {
    var self = this;

    // ... existing code ...

    // Wire up save button
    var applyBtn = document.getElementById('applyMetadata');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            self.save();
        });
        addDiagnostic('[MetadataForm] ✓ Save button wired');
    }
}
```

#### 1.3: Fix ExtendScript updateClipMetadata (2 hours)
```javascript
// File: jsx/host.jsx
// Current implementation may have issues - verify ES3 compatibility

function updateClipMetadata(nodeId, metadata) {
    try {
        var project = app.project;
        if (!project) {
            return JSON.stringify({ success: false, error: "No active project" });
        }

        // Find the project item by nodeId
        var item = findProjectItemByNodeId(project.rootItem, nodeId);
        if (!item) {
            return JSON.stringify({ success: false, error: "Clip not found" });
        }

        // Update Name field (visible in Project Panel)
        if (metadata.name !== undefined && metadata.name !== "") {
            item.name = metadata.name;
        }

        // Update Tape Name field (survives offline)
        if (metadata.tapeName !== undefined) {
            try {
                item.setProjectColumnsMetadata(["Tape"], [metadata.tapeName]);
            } catch (e) {
                // Tape Name field may not be available in all PP versions
            }
        }

        // Update Description field (Location, Subject, Action as comma-separated)
        if (metadata.location !== undefined || metadata.subject !== undefined || metadata.action !== undefined) {
            var descParts = [];
            if (metadata.location) descParts.push("Location: " + metadata.location);
            if (metadata.subject) descParts.push("Subject: " + metadata.subject);
            if (metadata.action) descParts.push("Action: " + metadata.action);

            var description = descParts.join(", ");
            try {
                item.setProjectColumnsMetadata(["Description"], [description]);
            } catch (e) {
                // Description field may not be available
            }
        }

        // Update Shot field (shot type)
        if (metadata.shotType !== undefined) {
            try {
                item.setProjectColumnsMetadata(["Shot"], [metadata.shotType]);
            } catch (e) {
                // Shot field may not be available
            }
        }

        return JSON.stringify({
            success: true,
            updatedName: item.name
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: "Failed to update metadata: " + e.toString()
        });
    }
}
```

#### 1.4: Add Field Validation (1 hour)
```javascript
// In MetadataForm.save()
validate: function() {
    var location = document.getElementById('metadataLocation').value;
    var subject = document.getElementById('metadataSubject').value;
    var action = document.getElementById('metadataAction').value;

    // Require at least location OR subject
    if (!location && !subject) {
        alert('Please enter at least Location or Subject');
        return false;
    }

    return true;
},

// Update save() to call validation
save: function() {
    if (!this.validate()) {
        return;
    }

    // ... rest of save logic ...
}
```

#### 1.5: Add Visual Feedback (1 hour)
```javascript
// Update save button state during save
save: function() {
    var self = this;
    var applyBtn = document.getElementById('applyMetadata');

    // Disable button during save
    applyBtn.disabled = true;
    applyBtn.textContent = 'Saving...';

    csInterface.evalScript(
        // ... evalScript call ...
        function(result) {
            // Re-enable button
            applyBtn.disabled = false;
            applyBtn.textContent = 'Apply to Premiere';

            // ... handle result ...
        }
    );
}
```

### Quality Gates
- Clicking "Apply to Premiere" updates PP Name field
- PP Name shows format: `{location}-{subject}-{action}-{shotType}`
- Success/failure alerts display
- Button disables during save
- Validation prevents empty saves
- Navigation panel updates after save

### Testing Checklist
```
1. Select clip in navigation
2. Enter metadata:
   - Location: Kitchen
   - Subject: Oven
   - Action: Cleaning
   - Shot Type: CU
3. Click "Apply to Premiere"
4. Verify in PP Project Panel:
   - Name field shows: "Kitchen-Oven-Cleaning-CU"
   - Description shows: "Location: Kitchen, Subject: Oven, Action: Cleaning"
   - Shot field shows: "CU"
5. Test edge cases:
   - Empty fields (should validate)
   - Only location filled (should work)
   - Special characters in text (should sanitize)
```

### Deliverables
- Updated js/panel-main.js (MetadataForm.save() method)
- Updated jsx/host.jsx (verified updateClipMetadata compatibility)
- Git commit: `feat: Wire metadata save to Premiere Pro`

---

## PHASE 2: ADD PRODUCTION FEATURES (8-10 hours)

### Objective

Add shoot grouping, "Good" checkbox, and confidence display to support team workflow.

### 2A: Shoot Grouping in Navigation (4-5 hours)

**Architectural Decision:**
- Current: Flat list of all clips
- Target: Grouped by shoot_id (from XMP metadata)

**Example:**
```
📁 Shoot 1 (2025-11-15) - 5 clips
  └─ Kitchen-Oven-Cleaning-CU
  └─ Bathroom-Sink-Wiping-MS
📁 Shoot 2 (2025-11-18) - 3 clips
  └─ Living-Room-Couch-Dusting-WS
```

#### 2A.1: Add Shoot ID to Clip Data (1 hour)
```javascript
// File: jsx/host.jsx - getAllProjectClips()

// Add shoot_id extraction from XMP
function getAllProjectClips() {
    try {
        var project = app.project;
        if (!project) {
            return JSON.stringify({ error: "No active project" });
        }

        var clips = [];
        collectClipsRecursive(project.rootItem, clips);

        var clipsData = [];
        for (var i = 0; i < clips.length; i++) {
            var item = clips[i];

            // Try to read XMP metadata for shoot_id
            var shootId = null;
            var shootDate = null;
            try {
                // ExtendScript XMP reading (if available in PP version)
                if (typeof item.getXMPMetadata === 'function') {
                    var xmpString = item.getXMPMetadata();
                    // Parse XMP string for <ShootID> tag
                    var shootIdMatch = xmpString.match(/<ShootID>(.*?)<\/ShootID>/);
                    if (shootIdMatch) {
                        shootId = shootIdMatch[1];
                    }

                    var shootDateMatch = xmpString.match(/<ShootDate>(.*?)<\/ShootDate>/);
                    if (shootDateMatch) {
                        shootDate = shootDateMatch[1];
                    }
                }
            } catch (xmpError) {
                // XMP not available or failed - use null
            }

            clipsData.push({
                nodeId: item.nodeId,
                name: item.name || "",
                treePath: item.treePath || "",
                mediaPath: item.getMediaPath() || "",
                shootId: shootId,        // NEW: From XMP
                shootDate: shootDate,    // NEW: From XMP
                // ... existing metadata fields ...
            });
        }

        return JSON.stringify({ clips: clipsData });

    } catch (e) {
        return JSON.stringify({
            error: "getAllProjectClips failed",
            details: e.toString()
        });
    }
}
```

#### 2A.2: Group Clips by Shoot (2 hours)
```javascript
// File: js/panel-main.js - ClipBrowser object

// Add grouping state
var PanelState = {
    // ... existing fields ...
    groupBy: 'shoot',  // null | 'shoot' | 'none'
    expandedGroups: {}  // { shootId: true/false }
};

// Add grouping method
ClipBrowser: {
    // ... existing methods ...

    groupClips: function(clips) {
        if (PanelState.groupBy !== 'shoot') {
            return { ungrouped: clips };
        }

        var groups = {};

        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            var shootId = clip.shootId || 'unassigned';

            if (!groups[shootId]) {
                groups[shootId] = {
                    shootId: shootId,
                    shootDate: clip.shootDate || 'Unknown',
                    clips: []
                };
            }

            groups[shootId].clips.push(clip);
        }

        return groups;
    },

    render: function() {
        var self = this;
        var filtered = this.applyFilters(PanelState.allClips);
        var groups = this.groupClips(filtered);

        var html = '';

        // Render grouped or flat
        if (PanelState.groupBy === 'shoot') {
            html = self.renderGrouped(groups);
        } else {
            html = self.renderFlat(filtered);
        }

        this.elements.clipList.innerHTML = html;

        // Wire up click handlers
        self.attachEventListeners();
    },

    renderGrouped: function(groups) {
        var html = '';

        // Sort groups by shoot date
        var groupIds = Object.keys(groups);
        groupIds.sort(function(a, b) {
            return groups[b].shootDate.localeCompare(groups[a].shootDate);
        });

        for (var i = 0; i < groupIds.length; i++) {
            var groupId = groupIds[i];
            var group = groups[groupId];
            var isExpanded = PanelState.expandedGroups[groupId] !== false;  // Default expanded

            var groupLabel = groupId === 'unassigned'
                ? 'Unassigned (' + group.clips.length + ')'
                : 'Shoot ' + groupId.substr(0, 8) + ' (' + group.shootDate + ') - ' + group.clips.length + ' clips';

            html += '<div class="clip-group">';
            html += '  <div class="clip-group-header" data-group-id="' + groupId + '">';
            html += '    <span class="group-toggle">' + (isExpanded ? '▼' : '▶') + '</span>';
            html += '    <span class="group-label">' + groupLabel + '</span>';
            html += '  </div>';

            if (isExpanded) {
                html += '<div class="clip-group-items">';
                for (var j = 0; j < group.clips.length; j++) {
                    html += this.renderClipItem(group.clips[j], j);
                }
                html += '</div>';
            }

            html += '</div>';
        }

        return html;
    },

    renderFlat: function(clips) {
        var html = '';
        for (var i = 0; i < clips.length; i++) {
            html += this.renderClipItem(clips[i], i);
        }
        return html;
    }
}
```

#### 2A.3: Add Group Toggle Interaction (1 hour)
```javascript
// In ClipBrowser.attachEventListeners()
attachEventListeners: function() {
    var self = this;

    // Group header toggle
    var groupHeaders = document.querySelectorAll('.clip-group-header');
    for (var i = 0; i < groupHeaders.length; i++) {
        groupHeaders[i].addEventListener('click', function(e) {
            var groupId = e.currentTarget.getAttribute('data-group-id');
            PanelState.expandedGroups[groupId] = !PanelState.expandedGroups[groupId];
            self.render();  // Re-render with updated state
        });
    }

    // ... existing clip click handlers ...
}
```

#### 2A.4: Add CSS for Groups (30 min)
```css
/* File: css/panel-layout.css */
.clip-group {
    margin-bottom: 4px;
}

.clip-group-header {
    padding: 8px 12px;
    background: #3a3a3a;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 3px;
}

.clip-group-header:hover {
    background: #4a4a4a;
}

.group-toggle {
    font-size: 10px;
    color: #888;
}

.group-label {
    font-weight: 500;
    font-size: 12px;
}

.clip-group-items {
    margin-left: 16px;
    margin-top: 4px;
}
```

### 2B: "Good" Checkbox (QC Approval) (2-3 hours)

#### 2B.1: Add Good Checkbox to UI (30 min)
```html
<!-- File: index.html - MetadataForm section -->
<div class="form-row">
    <label class="checkbox-label">
        <input type="checkbox" id="metadataGood" />
        <span>Good (QC Approved)</span>
    </label>
    <span class="hint">Mark this clip as quality-approved</span>
</div>
```

#### 2B.2: Save Good Status (1 hour)
```javascript
// In MetadataForm.save()
var metadata = {
    // ... existing fields ...
    good: document.getElementById('metadataGood').checked ? 'true' : 'false'
};

// Update ExtendScript to save to custom PP field
// jsx/host.jsx - updateClipMetadata()
if (metadata.good !== undefined) {
    try {
        // Use "Good" column if available, otherwise Scene
        item.setProjectColumnsMetadata(["Scene"], [metadata.good]);
    } catch (e) {
        // Column not available
    }
}
```

#### 2B.3: Add Good Filter (1 hour)
```javascript
// In ClipBrowser
applyFilters: function(clips) {
    var filtered = clips;

    // ... existing video/image filters ...

    // Good filter
    if (PanelState.filterGoodOnly) {
        filtered = filtered.filter(function(clip) {
            return clip.good === 'true';
        });
    }

    return filtered;
}

// Add filter checkbox to HTML
<label class="filter-checkbox">
    <input type="checkbox" id="filterGood">
    Good Only
</label>

// Wire up in init()
document.getElementById('filterGood').addEventListener('change', function() {
    PanelState.filterGoodOnly = this.checked;
    ClipBrowser.render();
});
```

### 2C: Display Match Confidence (1-2 hours)

#### 2C.1: Show Confidence in Navigation (1 hour)
```javascript
// In ClipBrowser.renderClipItem()
renderClipItem: function(clip, index) {
    var confidence = clip.matchConfidence || 0;
    var confidenceClass = confidence > 0.9 ? 'high' :
                         confidence > 0.7 ? 'medium' : 'low';

    var html = '<div class="clip-item" data-index="' + index + '">';
    html += '  <div class="clip-name">' + clip.name + '</div>';

    if (confidence > 0) {
        html += '  <div class="confidence-badge ' + confidenceClass + '">';
        html += Math.round(confidence * 100) + '%';
        html += '  </div>';
    }

    if (clip.good === 'true') {
        html += '  <span class="good-badge">✓</span>';
    }

    html += '</div>';
    return html;
}
```

#### 2C.2: CSS for Badges (30 min)
```css
.confidence-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: auto;
}

.confidence-badge.high {
    background: #0e7d0e;
    color: #fff;
}

.confidence-badge.medium {
    background: #c19c00;
    color: #fff;
}

.confidence-badge.low {
    background: #a80000;
    color: #fff;
}

.good-badge {
    color: #0e7d0e;
    font-size: 14px;
    margin-left: 4px;
}
```

### Quality Gates
- Clips grouped by shoot in navigation
- Groups expandable/collapsible
- "Good" checkbox saves to PP metadata
- "Good Only" filter works
- Confidence badges display correctly
- All features work together without conflicts

### Deliverables
- Updated js/panel-main.js (grouping, Good filter, confidence display)
- Updated jsx/host.jsx (Good field save)
- Updated index.html (Good checkbox)
- Updated css/panel-layout.css (group styles, badges)
- Git commit: `feat: Add shoot grouping, Good checkbox, confidence display`

---

## PHASE 3: POLISH & DEPLOYMENT PREP (2-3 hours)

### Objective

Remove debugging code, add user-facing documentation, prepare for team trial.

### Tasks

#### 3.1: Remove Diagnostic Overlay (30 min)
```javascript
// File: js/panel-main.js
// Remove or comment out addDiagnostic() function
// Remove diagnostic overlay creation
// Keep console.log for actual errors only
```

#### 3.2: Add In-Panel Help (1 hour)
```html
<!-- Add help icon/panel to metadata section -->
<div class="help-panel" id="helpPanel" style="display: none;">
    <h3>Quick Guide</h3>
    <ul>
        <li><strong>Navigation:</strong> Click clip to load metadata</li>
        <li><strong>Grouping:</strong> Clips grouped by shoot (click header to expand/collapse)</li>
        <li><strong>Good Checkbox:</strong> Mark QC-approved clips</li>
        <li><strong>Confidence:</strong> Green = AI confident, Red = needs review</li>
        <li><strong>Save:</strong> Click "Apply to Premiere" to update PP</li>
    </ul>
</div>

<!-- Add help toggle button -->
<button id="helpToggle" class="icon-btn">?</button>
```

#### 3.3: Error Handling (1 hour)
```javascript
// Add global error handler
window.addEventListener('error', function(e) {
    console.error('[Panel] Unhandled error:', e.error);
    // Don't alert - just log
});

// Add ExtendScript timeout handling
csInterface.evalScript(script, function(result) {
    if (!result || result === 'EvalScript error.') {
        console.error('[Panel] ExtendScript timeout or error');
        alert('Communication error with Premiere Pro. Please restart panel.');
        return;
    }
    // ... handle result ...
});
```

#### 3.4: Create User Guide (30 min)

See file: `.coord/docs/USER-GUIDE.md` (create new file)

### Quality Gates
- No diagnostic overlay in production
- Help panel accessible
- Error handling graceful
- User guide complete

### Deliverables
- Cleaned js/panel-main.js (no debug code)
- Added .coord/docs/USER-GUIDE.md
- Git commit: `polish: Remove debug code, add user guide`

---

## PHASE 4: TEAM TRIAL DEPLOYMENT (1 hour + 1 week trial)

### Objective

Deploy to 1-2 editors for real-world usage, collect evidence for architectural decisions.

### 4.1: Deployment Checklist

```bash
# 1. Commit all changes to main branch
git add .
git commit -m "release: CEP Panel v0.2.0 - Two-panel architecture"
git push origin main

# 2. Deploy to editor machines
# For each editor machine:
scp -r . editor-machine:~/Library/Application\ Support/Adobe/CEP/extensions/eav-cep-assist/

# 3. Test on editor machine
# - Restart Premiere Pro
# - Open panel
# - Verify all features work
```

### 4.2: Evidence Collection Plan

**Daily Check-In Questions (ask editors):**
1. What navigation pattern did you use most? (scroll? group expand/collapse?)
2. Which metadata fields did you edit most often?
3. Did anything break or feel awkward?
4. How often did you use "Good" checkbox?
5. Did you notice confidence scores? Were they useful?

**Usage Metrics to Collect (if possible):**
- Clips tagged per day
- Most common metadata values
- Good checkbox usage frequency
- Time per clip (navigation → tag → save)
- Error frequency

**Feedback Form (end of week):**
See file: `.coord/trial/FEEDBACK-FORM.md` (create new file)

### 4.3: Issue Tracking

See file: `.coord/trial/ISSUES.md` (create new file)

### Quality Gates
- 2 editors deployed and trained
- Daily check-ins scheduled
- Feedback form distributed
- Issue tracking active

### Deliverables
- Deployed to editor machines
- Trial documentation (USER-GUIDE.md)
- Feedback collection process
- Issue tracking file

---

## PHASE 5: EVIDENCE-BASED DECISION (Post-Trial)

### Objective

Analyze trial results, decide next architectural direction.

### Decision Matrix

**IF trial shows:**
- ✓ Editors use it daily
- ✓ Metadata save works reliably
- ✓ Navigation pattern fits workflow
- ✓ <5 critical bugs
- ✓ Feature requests are incremental
→ **DECISION: Continue iterating on current architecture**

**IF trial shows:**
- ✗ Navigation pattern doesn't fit workflow (e.g., need search not groups)
- ✗ >5 critical bugs or frequent crashes
- ✗ Editors avoid using it (workarounds faster)
- ✗ Architecture blocks essential features
→ **DECISION: Rebuild with evidence-based requirements**

**IF trial shows:**
- ~ Mixed results (some works, some doesn't)
- ~ Editors use it but with workarounds
- ~ Architectural changes needed but not fundamental
→ **DECISION: Major refactor (keep foundation, redesign problem areas)**

### Next Steps Document

See file: `.coord/trial/POST-TRIAL-ANALYSIS.md` (create new file)

---

## SUCCESS CRITERIA & QUALITY GATES

### Phase-Level Gates

| Phase                  | Duration   | Pass Criteria                                          |
|------------------------|------------|--------------------------------------------------------|
| 0: Architecture        | 4-6h       | Two panels load, no thumbnail, ES3 compatible          |
| 1: Metadata Save       | 6-8h       | Metadata saves to PP, name updates, validation works   |
| 2: Production Features | 8-10h      | Grouping works, Good filter works, confidence displays |
| 3: Polish              | 2-3h       | No debug code, help accessible, errors handled         |
| 4: Trial               | 1h + 1wk   | 2 editors using daily, feedback collected              |
| 5: Decision            | Post-trial | Evidence-based next direction chosen                   |

### Overall Success Metrics

- ✓ Editors can navigate clips (grouped by shoot)
- ✓ Editors can save metadata to PP
- ✓ Editors can mark Good clips
- ✓ Editors can filter by Good/confidence
- ✓ Source Monitor opens on click
- ✓ Real usage reveals requirements
- ✓ Evidence collected for next phase

---

## RISK MITIGATION

### Risk: ExtendScript Breaks

- **Probability:** Medium
- **Impact:** Critical (blocks all functionality)
- **Mitigation:**
  - Test on multiple PP versions (2024, 2025)
  - Wrap all evalScript calls in try-catch
  - Fallback: Web UI for metadata entry (ingest-assistant)

### Risk: Editors Don't Adopt

- **Probability:** Medium
- **Impact:** High (wasted effort)
- **Mitigation:**
  - Daily check-ins (catch issues early)
  - Train editors on workflow (not just features)
  - Make feedback easy (Slack/email)

### Risk: Architecture Blocks Future Features

- **Probability:** Low
- **Impact:** High (need rebuild)
- **Mitigation:**
  - Keep architecture simple (easy to refactor)
  - Use evidence from trial (not assumptions)
  - Budget for rebuild if needed (sunk cost acceptance)

---

## TIMELINE SUMMARY

| Phase                  | Duration                   | Cumulative |
|------------------------|----------------------------|------------|
| 0: Two-Panel Refactor  | 4-6h                       | 6h         |
| 1: Fix Metadata Save   | 6-8h                       | 14h        |
| 2: Production Features | 8-10h                      | 24h        |
| 3: Polish & Docs       | 2-3h                       | 27h        |
| 4: Deploy for Trial    | 1h                         | 28h        |
| Development Total      | ~28 hours                  | ~3.5 days  |
| 5: Trial Period        | 1 week                     | +7 days    |
| 6: Analysis & Decision | 4h                         | +4h        |
| **Total Timeline**     | **~4 days dev + 1 week trial** | **~11 days** |

---

## DELIVERABLES CHECKLIST

### Code
- [ ] index.html - Two-panel layout
- [ ] js/panel-main.js - Refactored components
- [ ] jsx/host.jsx - ES3-compatible ExtendScript
- [ ] css/panel-layout.css - Two-panel grid + badges

### Documentation
- [ ] .coord/docs/USER-GUIDE.md - Editor-facing guide
- [ ] .coord/trial/ISSUES.md - Issue tracking
- [ ] .coord/trial/FEEDBACK-FORM.md - Feedback template
- [ ] .coord/trial/POST-TRIAL-ANALYSIS.md - Decision document

### Git Commits
- [ ] `refactor: Two-panel architecture (navigation + metadata)`
- [ ] `feat: Wire metadata save to Premiere Pro`
- [ ] `feat: Add shoot grouping, Good checkbox, confidence display`
- [ ] `polish: Remove debug code, add user guide`
- [ ] `release: CEP Panel v0.2.0 - Two-panel architecture`

---

**Document Status:** Ready for implementation
**Last Updated:** 2025-11-10
**Owner:** CEP Panel Development Team
