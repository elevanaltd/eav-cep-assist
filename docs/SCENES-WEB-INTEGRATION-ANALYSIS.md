# Scenes Web Integration Analysis for CEP Panel
## How Shot Planning Data Flows into CEP for Footage Reconciliation

**Analysis Date:** 2025-11-10  
**Scope:** Understanding Scenes Web (Step 4 Pipeline) shot data structure and CEP panel integration requirements

---

## EXECUTIVE SUMMARY

The CEP panel currently operates as a **standalone metadata editor** for clips already imported into Premiere Pro. To integrate with Scenes Web (Step 4 planned shot structure), the panel must transition from manual-entry mode to a **shot-matching system** that:

1. **Receives planned shots** from Scenes Web API/database (shot list with {location}, {subject}, {action}, {shot-type})
2. **Displays planned shots** as searchable list in panel UI
3. **Matches raw footage** to planned shots via AI analysis + manual confirmation
4. **Preserves component_id traceability** for ecosystem consistency
5. **Updates PP metadata** with both structured naming AND component references

---

## PART 1: CURRENT ARCHITECTURE (CEP PANEL)

### 1.1 CEP Panel Structure (Status: ✅ Functional Phase 1)

**Location:** `/home/user/eav-cep-assist/`

**Current Flow:**
```
User Selects Clip in PP
        ↓
Panel Polls Selection (every 2s)
        ↓
Loads Clip Name + Existing Metadata from PP
        ↓
User Types: Location, Subject, Action, Shot Type
        ↓
Live Preview: id-location-subject-action-shotType
        ↓
User Clicks "Apply to Premiere"
        ↓
Updates PP Project Columns: Name, Tape, Description, Shot
```

**Key Components:**

| File | Purpose | Size | Key Functions |
|------|---------|------|---|
| `jsx/host.jsx` | ExtendScript bridge to PP API | 7.8 KB | `getSelectedClips()`, `updateClipMetadata()`, `getAllProjectClips()` |
| `js/main.js` | Panel UI logic & state | 14.6 KB | `loadSelectedClip()`, `applyMetadata()`, polling loop |
| `index.html` | Form layout (horizontal strip) | 5.4 KB | ID, Location, Subject, Action, ShotType fields |
| `CSXS/manifest.xml` | Extension config | - | Host PPRO v14.0+, CEP 9.0 |

### 1.2 Current Data Structure (Shot Metadata Only)

**Shot Type Vocabulary (Controlled):**
```javascript
WS (Wide Shot), MID (Medium Shot), CU (Close Up), 
UNDER (Underslung), FP (First Person), TRACK (Tracking), ESTAB (Establishing)
```

**Structured Naming Format:**

- **Videos:** `{8-digit-id}-{location}-{subject}-{action}-{shotType}`
  - Example: `12345678-kitchen-oven-cleaning-CU`

- **Images:** `{8-digit-id}-{location}-{subject}-{shotType}`
  - Example: `12345678-kitchen-sink-WS`

**PP Metadata Fields Updated:**
```
Name          → "{id}-{location}-{subject}-{action}-{shotType}"
Tape          → Original filename (preserved for source reference)
Description   → Metadata tags (comma-separated)
Shot          → Shot type value (WS, MID, CU, etc.)
```

### 1.3 Current Integration Points (None with Scenes Web)

**✅ What Exists:**
- Manual form entry
- Polling-based selection detection
- Local state management
- PP project metadata write-through

**❌ What's Missing:**
- Planned shot data source (no API to Scenes Web)
- Component ID preservation
- Shot matching/reconciliation logic
- Planned vs. actual footage comparison
- Batch assignment capability

---

## PART 2: INGEST ASSISTANT PATTERNS (Learning from Electron App)

### 2.1 File Metadata Structure (ingest-assistant Reference)

**Location:** `/home/user/ingest-assistant/src/types/index.ts`

```typescript
export interface FileMetadata {
  id: string;                    // First 8 digits from filename (IMMUTABLE)
  originalFilename: string;      // Original camera filename
  currentFilename: string;       // After processing
  filePath: string;              // Full path
  extension: string;             // .mp4, .mov, etc.
  
  // Structured naming components (from Scenes Web planning)
  location?: string;             // "kitchen", "bathroom", etc.
  subject?: string;              // "oven", "sink", etc.
  action?: string;               // "cleaning", "installing" (videos only)
  shotType?: ShotType;           // "WS", "CU", "MID", etc.
  
  // Metadata & processing state
  metadata: string[];            // Additional tags
  processedByAI: boolean;        // AI has analyzed this
  lastModified: Date;            // Timestamp
  fileType: 'image' | 'video';   // Media type
}
```

**Critical Pattern:** The 8-digit ID extracted from filename is **immutable** and survives renames. This pattern should map to **component_id** in the EAV ecosystem.

### 2.2 AI Analysis Result Format

```typescript
export interface AIAnalysisResult {
  mainName: string;              // "kitchen-oven-cleaning-CU"
  metadata: string[];            // ["appliance", "controls", "interior"]
  confidence: number;            // 0.0 - 1.0 score
  
  // Structured components
  location?: string;
  subject?: string;
  action?: string;
  shotType?: ShotType;
}
```

---

## PART 3: COMPONENT SPINE PATTERN (EAV Ecosystem)

### 3.1 Component ID Traceability

**Pattern Found:** `component_id` FK references across all EAV component tables (verified in ADR-003)

```typescript
// From ADR-003 Compliance Standard
interface ComponentReference {
  component_id: UUID;            // Foreign key to components(id)
  // All component tables must follow this pattern
}
```

**Current CEP Usage:** ❌ No component_id tracking  
**What's Needed:** ✅ Extract component_id from planned shot and preserve in metadata

### 3.2 Component Spine Concept

Based on patterns in ingest-assistant and CEP panel, the **"component spine"** is:

```
Cameras → Shot Plans (Scenes Web)  →  Raw Footage (CEP Ingest)  →  Scripts (scripts-web)
    ↓           ↓                         ↓                           ↓
  {id}   {component_id}          {Rename + Tag}              {Link to Script}
```

**Critical Link:** 
- Scenes Web creates **planned shots** with `component_id` reference
- CEP panel must **receive and preserve** that `component_id` 
- Later, scripts-web **queries by component_id** to find associated footage

---

## PART 4: SHOT DATA STRUCTURE (What Scenes Web Provides)

### 4.1 Inferred Shot Structure from CEP UI

Based on the CEP panel form fields, Scenes Web likely outputs:

```typescript
interface PlannedShot {
  shot_id: string;              // e.g., "SHOT_001"
  component_id: UUID;           // Link to script component
  
  // Spatial/Subject descriptors
  location: string;             // "kitchen", "bedroom"
  subject: string;              // "oven", "window"
  action?: string;              // "cleaning", "installing" (optional, videos only)
  
  // Camera framing
  shot_type: string;            // "WS", "MID", "CU", "UNDER", "FP", "TRACK", "ESTAB"
  
  // Planning metadata
  description?: string;         // Human-readable description
  duration_estimate?: number;   // Expected clip length in seconds
  priority?: 'high' | 'medium' | 'low';  // Shooting priority
  status?: 'planned' | 'shot' | 'completed';  // Current status
  
  // Linking back to script
  scene_id?: string;            // Which scene in script
  beat_id?: string;             // Narrative beat reference
  character_ids?: UUID[];       // Characters in this shot
}
```

### 4.2 How Shots Relate to Components (Component Spine)

```
Script Component (scripts-web)
    ↓
    id = component_id (UUID)
    type = "scene" or "beat"
    ↓
Planned Shot (Scenes Web)
    ↓
    component_id = references script component
    shot_id = SHOT_001
    location/subject/action/shotType = shot framing
    ↓
Raw Footage File (camera card)
    ↓
    {camera-id}-{filename}.mp4
    (no metadata yet)
    ↓
Tagged Clip (CEP panel after reconciliation)
    ↓
    Name: {camera-id}-{location}-{subject}-{action}-{shotType}
    Metadata[component_id]: {UUID}  ← PRESERVED FOR TRACEABILITY
    Metadata[shot_id]: SHOT_001      ← LINKS TO PLAN
```

---

## PART 5: INTEGRATION APPROACH RECOMMENDATIONS

### 5.1 OPTION A: API-Based Shot Loading (Recommended)

**Timeline:** Medium complexity, high reliability

**Architecture:**

```
CEP Panel (Phase 2+)
    ↓
[New] Shot Data Manager Service
    ├── GET /api/planned-shots → List of PlannedShot[]
    ├── GET /api/planned-shots/{component_id} → Single shot details
    └── PATCH /api/planned-shots/{shot_id}/status → Mark "completed"
    ↓
Scenes Web Backend
    ├── Stores shot plans in database
    └── Exposes REST API
```

**Implementation in CEP:**

```javascript
// New module: js/shotManager.js
var ShotManager = (function() {
    var plannedShots = [];           // Cache of all planned shots
    var selectedShot = null;         // Currently matched shot
    
    function loadPlannedShots(projectId) {
        // Fetch from Scenes Web API
        fetch('https://scenes-web.local/api/projects/' + projectId + '/shots')
            .then(r => r.json())
            .then(data => {
                plannedShots = data.shots;
                displayShotList();
            });
    }
    
    function matchFootageToShot(clipData, shot) {
        // Set clip metadata from planned shot
        return {
            name: buildName(clipData.id, shot),
            tapeName: clipData.originalName,
            description: shot.description,
            shot: shot.shot_type,
            component_id: shot.component_id,  // ← PRESERVE FOR TRACEABILITY
            shot_id: shot.shot_id              // ← LINK TO PLAN
        };
    }
    
    return {
        loadPlannedShots: loadPlannedShots,
        matchFootageToShot: matchFootageToShot,
        getPlannedShots: function() { return plannedShots; }
    };
})();
```

### 5.2 OPTION B: Import/Export File (Lower Risk)

**Timeline:** Fast, works without backend

**Approach:**

1. Scenes Web exports shot plan as JSON file
2. User imports into CEP panel via file picker
3. Panel matches clips to shots in memory
4. No API required, fully local

**File Format:**

```json
{
  "project_id": "proj_abc123",
  "export_date": "2025-11-10T14:30:00Z",
  "shots": [
    {
      "shot_id": "SHOT_001",
      "component_id": "comp_uuid_here",
      "location": "kitchen",
      "subject": "oven",
      "action": "cleaning",
      "shot_type": "CU",
      "description": "Close-up of oven controls showing temperature display"
    },
    {
      "shot_id": "SHOT_002",
      "component_id": "comp_uuid_here",
      "location": "kitchen",
      "subject": "sink",
      "action": "installing",
      "shot_type": "WS",
      "description": "Wide shot of entire sink installation area"
    }
  ]
}
```

### 5.3 OPTION C: Hybrid (Recommended for Production)

**Phase 2.1 (Quick Launch):** Use import/export file  
**Phase 2.2 (Maturity):** Upgrade to API integration  
**Phase 2.3 (Optimization):** Add real-time sync

---

## PART 6: DETAILED INTEGRATION WORKFLOW

### 6.1 Phase 2: Shot Matching Workflow (How it Changes)

**Current Phase 1 (Manual Entry):**
```
Select Clip → Type Fields → Apply → Done
```

**Proposed Phase 2 (Planned Shot Matching):**
```
Load Project
    ↓
Get Planned Shots (from Scenes Web / Import File)
    ↓
Select Clip from PP
    ↓
PANEL SUGGESTS MATCHES:
    [✓] Show list of unmatched planned shots
    [✓] Sort by matching score (location/subject/action similarity)
    [?] Allow drag-drop to match
    ↓
User Selects from Suggested Shots
    ↓
Pre-fill form with planned shot data
    ↓
Review AI Analysis (optional second opinion)
    ↓
Apply to Premiere
    ↓
CRITICAL: Update metadata with:
    - component_id (from shot)
    - shot_id (from shot)
    - structured naming
    ↓
Mark Shot as "Completed" in Scenes Web
```

### 6.2 UI Changes Required

**Current Form:**
```
[ID]          [Location]    [Subject]    [Action]    [Shot Type]
[Readonly]    [Text input]  [Text input] [Text input] [Dropdown]
```

**Phase 2 Form (Two-panel layout):**

```
LEFT PANEL: Planned Shots List
┌─────────────────────────┐
│ Planned Shots (17)      │
├─────────────────────────┤
│ □ SHOT_001 (kitchen)    │
│ ☑ SHOT_002 (kitchen)    │ ← Selected
│ □ SHOT_003 (bathroom)   │
│ □ SHOT_004 (kitchen)    │
│ ...                     │
└─────────────────────────┘

RIGHT PANEL: Current Clip + Shot Matching
┌──────────────────────────────────────┐
│ Clip: EB001234-oven-control-panel    │
│                                      │
│ Suggested Shot: SHOT_002             │
│ Match Confidence: 85%                │
│ ☑ Location: kitchen (high match)     │
│ ☑ Subject: oven (high match)         │
│ ☑ Action: cleaning (medium match)    │
│ ☑ Shot Type: CU (high match)         │
│                                      │
│ [Accept Match] [Suggest Alternative]│
│ [Apply to Premiere] [Skip/Manual]   │
└──────────────────────────────────────┘
```

### 6.3 Metadata Update Pattern

**What gets written to PP project:**

```javascript
var metadata = {
    // Visible in bins
    name: "{8-digit-id}-{location}-{subject}-{action}-{shotType}",
    
    // Project columns (survives offline)
    tapeName: originalCameraFilename,
    description: plannedShot.description,
    shot: plannedShot.shot_type,
    
    // NEW: Component traceability (custom PP fields or Keywords)
    component_id: plannedShot.component_id,   // UUID for scripts-web linking
    shot_id: plannedShot.shot_id,             // SHOT_001 for reference
    
    // NEW: Confidence tracking
    match_confidence: 0.85,                    // AI match score
    matched_by: "user_confirmed"              // "auto" or "user_confirmed"
};
```

---

## PART 7: API SPECIFICATION (IF OPTION A)

### 7.1 Scenes Web Endpoints (Proposed)

```
GET /api/projects/{project_id}/shots
├── Returns: PlannedShot[]
├── Usage: Load all planned shots for a project
└── Response:
    {
      "shots": [
        {
          "shot_id": "SHOT_001",
          "component_id": "uuid-...",
          "location": "kitchen",
          "subject": "oven",
          "action": "cleaning",
          "shot_type": "CU",
          "description": "..."
        }
      ],
      "total": 17,
      "project_id": "proj_..."
    }

GET /api/shots/{shot_id}
├── Returns: Single PlannedShot with full details
└── Usage: Get details for manual matching

PATCH /api/shots/{shot_id}/status
├── Payload: {"status": "completed", "footage_id": "..."}
├── Usage: Mark shot as matched/filmed
└── Response: 200 OK with updated shot

POST /api/shots/{shot_id}/match
├── Payload: {
│   "footage_id": "EB001234",
│   "component_id": "comp_...",
│   "confidence": 0.85,
│   "matched_at": "2025-11-10T14:30:00Z"
│ }
├── Usage: Create matching record for traceability
└── Response: 201 Created with match record
```

### 7.2 Component ID Preservation Strategy

**Critical:** The CEP panel must never lose the component_id linkage

```javascript
// In host.jsx (ExtendScript):
function updateClipMetadata(nodeId, metadata) {
    var item = findProjectItemByNodeId(app.project.rootItem, nodeId);
    
    if (!item) return errorResponse("Clip not found");
    
    try {
        // Primary metadata (visible in bins)
        item.name = metadata.name;
        item.setProjectColumnsMetadata(["Tape"], [metadata.tapeName]);
        item.setProjectColumnsMetadata(["Description"], [metadata.description]);
        item.setProjectColumnsMetadata(["Shot"], [metadata.shot]);
        
        // CRITICAL: Component traceability
        // Option 1: Use Keywords field (comma-separated)
        var keywords = [
            metadata.component_id,
            metadata.shot_id,
            "matched:" + metadata.matched_by
        ].join(",");
        item.setProjectColumnsMetadata(["Keywords"], [keywords]);
        
        // Option 2: Extend with custom PP metadata (if available)
        // (May require ExtendScript scripting extensions)
        
        return successResponse({
            updatedName: item.name,
            component_id: metadata.component_id  // Confirm preservation
        });
    } catch (e) {
        return errorResponse("Metadata update failed: " + e.toString());
    }
}
```

---

## PART 8: COMPONENT SPINE DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│                         COMPONENT SPINE                          │
│                    (Data Flow Through EAV Suite)                 │
└──────────────────────────────────────────────────────────────────┘

STEP 1: SCRIPTS-WEB (Script Writing)
┌──────────────────────────────┐
│ Script Component             │
│ ├── id: "comp_abc123" ← UUID │
│ ├── type: "scene"            │
│ ├── name: "Kitchen Scene"    │
│ └── beats: [beat_1, beat_2]  │
└──────────────────┬───────────┘
                   │
                   ↓
STEP 2: SCENES-WEB (Shot Planning)
┌──────────────────────────────┐
│ Planned Shot                 │
│ ├── shot_id: "SHOT_001"      │
│ ├── component_id: comp_abc123│ ← Link back to script
│ ├── location: "kitchen"      │
│ ├── subject: "oven"          │
│ ├── action: "cleaning"       │
│ ├── shot_type: "CU"          │
│ └── status: "planned"        │
└──────────────────┬───────────┘
                   │
                   ↓
STEP 3: CAMERA (Raw Footage)
┌──────────────────────────────┐
│ Raw File                     │
│ ├── name: "EB001234.mp4"     │
│ ├── size: 4.2 GB             │
│ ├── duration: 00:02:45       │
│ └── [NO METADATA]            │
└──────────────────┬───────────┘
                   │
                   ↓
STEP 4: CEP PANEL (Ingest + Metadata Tagging) ← YOU ARE HERE
┌────────────────────────────────────────────┐
│ CEP Panel: Match & Tag                     │
│                                            │
│ 1. Load Planned Shots from Scenes Web      │
│ 2. Select Raw Clip (EB001234.mp4)          │
│ 3. Suggest Match (SHOT_001)                │
│ 4. User Confirms                           │
│ 5. Pre-fill with Shot Data:                │
│    - location: "kitchen"                   │
│    - subject: "oven"                       │
│    - action: "cleaning"                    │
│    - shot_type: "CU"                       │
│                                            │
│ 6. Update PP Metadata:                     │
│    - Name: "EB001234-kitchen-oven-CU"      │
│    - component_id: comp_abc123  ← CRITICAL │
│    - shot_id: SHOT_001          ← CRITICAL │
│                                            │
│ Result: Clip tagged + linked to script     │
└──────────────────┬───────────────────────────┘
                   │
                   ↓
STEP 5: EDIT-WEB (Assembly/Timeline)
┌──────────────────────────────┐
│ Sequence Assembly            │
│ (Uses PP project with tagged │
│  clips for rough cut)        │
└──────────────────┬───────────┘
                   │
                   ↓
STEP 6: VO-WEB (Voice Over Integration)
┌──────────────────────────────┐
│ VO Sync                      │
│ (Queries clips by component_id│
│  to find matching footage)   │
└──────────────────┬───────────┘
                   │
                   ↓
STEP 7: TRANSLATIONS-WEB (Localization)
┌──────────────────────────────┐
│ Localized Versions           │
│ (Uses component_id to track  │
│  corresponding footage in    │
│  other languages)            │
└──────────────────────────────┘

KEY FLOWS:
- scripts-web → scenes-web: component_id reference (planning links to script)
- scenes-web → cep-panel: shot_id + component_id (what to match)
- cep-panel → edit-web: component_id in PP metadata (enables linking)
- edit-web → vo-web: component_id lookup (find footage for VO)
```

---

## PART 9: GAP ANALYSIS

### 9.1 What Exists ✅

| Requirement | Current State | Evidence |
|---|---|---|
| Structured naming format | ✅ Implemented | `{id}-{location}-{subject}-{action}-{shotType}` in CEP |
| Shot type vocabulary | ✅ Defined | WS, MID, CU, UNDER, FP, TRACK, ESTAB (controlled) |
| PP metadata write-through | ✅ Working | `setProjectColumnsMetadata()` via ExtendScript |
| Selection-aware UI | ✅ Functional | Polling + nodeId tracking in main.js |
| Component ID pattern | ✅ Defined | ADR-003 compliance across ecosystem |

### 9.2 What's Missing ❌

| Gap | Impact | Solution |
|---|---|---|
| No Scenes Web data source | Can't receive planned shots | Implement API or import/export |
| No shot matching UI | User must manually match | Add suggested shots list |
| No component_id preservation | Breaks ecosystem linking | Update metadata write to include UUID |
| No shot_id tracking | Can't link to planning | Add shot_id to PP Keywords field |
| No match confidence display | User can't validate suggestions | Add AI scoring to UI |
| No batch reconciliation | Slow workflow for many clips | Add "Mark All As Matched" feature |
| No status sync | Scenes Web doesn't know clip is matched | Add PATCH to mark shot as "completed" |

### 9.3 Integration Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Scenes Web API not finalized | Medium | Use import/export file for Phase 2.1 |
| PP metadata field limitations | Low | Use Keywords field for component_id |
| Component ID collision | Very Low | UUID format guarantees uniqueness |
| Batch updates too slow | Medium | Implement efficient polling + caching |
| User matches wrong clip to shot | Medium | Show AI confidence score + manual review |

---

## PART 10: IMPLEMENTATION TIMELINE

### Phase 2.1: Foundation (2 weeks)
- [ ] Add shot matching UI (leftpanel list + suggestions)
- [ ] Implement import/export for shot plans (JSON)
- [ ] Add component_id to PP metadata via Keywords field
- [ ] Update README with Scenes Web workflow

### Phase 2.2: API Integration (3-4 weeks)
- [ ] Define Scenes Web API contract
- [ ] Implement ShotManager service
- [ ] Add real-time shot list refresh
- [ ] Create API error handling

### Phase 2.3: Optimization (2 weeks)
- [ ] Add batch matching UI
- [ ] Implement confidence scoring display
- [ ] Add match history tracking
- [ ] Performance optimization for large shot lists

### Phase 2.4: Polish & Launch (1 week)
- [ ] User testing with actual shot data
- [ ] Documentation + training
- [ ] Integration with scripts-web (validation)
- [ ] Deployment to production

---

## PART 11: RECOMMENDED ACTION PLAN

### Immediate (This Sprint)

1. **Get Scenes Web Shot Structure Confirmed**
   - Contact scenes-web owner
   - Get sample shot export/API response
   - Validate against inferred structure in Part 4

2. **Create CEP Panel Phase 2 Spec**
   - Document exact API contract OR JSON file format
   - Design shot matching UI mockup
   - Specify component_id preservation requirement

3. **Set Up Import/Export Pipeline (Quick MVP)**
   - Create ShotManager service in CEP
   - Implement JSON file import via file picker
   - Update PP metadata to include component_id

### Near-term (1-2 Weeks)

4. **Implement Shot Matching UI**
   - Add left panel with planned shots list
   - Add suggestion scoring (location/subject/action matching)
   - Update metadata writing to preserve component_id

5. **Test with Real Data**
   - Export actual shot plan from Scenes Web
   - Import into CEP panel
   - Match sample footage
   - Verify component_id in PP project file

### Medium-term (3-4 Weeks)

6. **Upgrade to API Integration**
   - Define Scenes Web API endpoints
   - Implement real-time shot fetching
   - Add match status sync back to Scenes Web

---

## CONCLUSION

The CEP panel has an excellent foundation (✅ Phase 1: Manual Metadata Entry). To integrate with Scenes Web, focus on:

1. **Receiving planned shots** (API or import file)
2. **Matching footage** (UI + suggestions)
3. **Preserving component_id** (via PP Keywords or custom fields)
4. **Syncing status** (mark shots as completed)

The component spine pattern is already established in the EAV ecosystem—the CEP panel must become a **component-aware** tool that acts as the reconciliation bridge between planned shots and raw footage.

**Recommend starting with Option B (Import/Export)** for Phase 2.1 to validate the workflow, then upgrade to Option A (API) once Scenes Web API is stable.

