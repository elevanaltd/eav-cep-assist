# CEP Panel - Claude Assistant Guide

**Purpose:** Operational knowledge for AI assistance on this Adobe Premiere Pro CEP extension project.

---

## 🔍 Debug Console Access (CRITICAL)

**⚠️ PRIMARY DEBUG SOURCE: CEP Panel Consoles (NOT ExtendScript Console)**

### **1. Metadata Panel Console (PRIMARY)**
- **Location:** Right-click Metadata Panel → Debug (opens Chromium DevTools)
- **Shows:** `js/metadata-panel.js` execution + ExtendScript call results
- **Key Prefixes:**
  - `[MetadataForm]` → Form operations (load, save, navigation)
  - `✓` → Success operations
  - `✗` → Error operations
  - `▶` → Navigation actions
  - `typeof EAVIngest:` → ExtendScript availability check
  - `JSON Parse error:` → ExtendScript return value issues

### **2. Navigation Panel Console (PRIMARY)**
- **Location:** Right-click Navigation Panel → Debug (opens Chromium DevTools)
- **Shows:** `js/navigation-panel.js` execution + ExtendScript call results
- **Key Prefixes:**
  - `[ClipBrowser]` → Clip loading and filtering
  - `[XMP]` → XMP warm-up delay and cache operations
  - `typeof EAVIngest:` → ExtendScript availability check
  - `Calling getAllProjectClips...` → ExtendScript function calls

**⚠️ CRITICAL:** These diagnostics panels show **actual errors** - they are the primary debug source!

### **3. ExtendScript Console (USUALLY EMPTY)**
- **Location:** Premiere Pro → Help → Console (or Cmd+F12 on macOS)
- **Reality:** Console is **empty by default** - ExtendScript does NOT output automatically
- **Purpose:** Manual script testing only (not automatic diagnostics)

**To Test ExtendScript Manually:**
```javascript
// Paste this into ExtendScript Console to test EAVIngest:
typeof EAVIngest
// Expected: "object"

// Test getAllProjectClips:
EAVIngest.getAllProjectClips()
// Expected: JSON string with clips array

// Test if functions exist:
typeof EAVIngest.readJSONMetadataByNodeId
// Expected: "function"
```

**⚠️ DO NOT expect automatic output in ExtendScript Console** - it stays empty during normal operation. Use CEP panel consoles instead.

### **How to Request Diagnostics (CORRECTED):**
```
"Please copy/paste from CEP Panel consoles:
1. Metadata Panel console (right-click panel → Debug → Console tab)
2. Navigation Panel console (right-click panel → Debug → Console tab)

ExtendScript Console is usually empty - only use it for manual testing."
```

---

## 🏗️ Architecture Overview

### **Two-Panel CEP System**
1. **Navigation Panel (Bottom):** Clip browser with search/filter → Dispatches selection events
2. **Metadata Panel (Right):** Metadata form with Previous/Next → Receives selection, writes XMP

### **Communication Flow**
```
User clicks clip in Navigation Panel
  → Navigation Panel dispatches CEP event (com.eav.clipSelected)
  → Metadata Panel receives event
  → Metadata Panel loads clip data via ExtendScript
  → User edits fields
  → User clicks "Apply to Premiere"
  → Metadata Panel calls ExtendScript (updateClipMetadata)
  → ExtendScript writes XMP to Premiere Pro
  → Green checkmark appears
```

### **Three-Layer Architecture**
1. **HTML/CSS:** `index-metadata.html`, `index-navigation.html`, `css/*.css`
2. **JavaScript (CEP):** `js/metadata-panel.js`, `js/navigation-panel.js`, `js/CSInterface.js`
3. **ExtendScript (Premiere Pro):** `jsx/host.jsx` (XMP read/write, Project Panel interaction)


### **Metadata Strategy - JSON Read + Limited XMP Write (Schema 2.0)**

**CURRENT IMPLEMENTATION (November 2025 - Production Ready):**

This project uses **JSON sidecar files** (Schema 2.0) as the primary metadata source, with **limited XMP write capability** for Premiere Pro clip name updates.

####  **✅ JSON Sidecar Read (VALIDATED - Production Ready)**
- **File:** `.ingest-metadata.json` (co-located with proxy/raw video files)
- **Format:** Schema 2.0 - See [`.coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md`](.coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md)
- **Capability:** CEP Panel reads ALL metadata fields (location, subject, action, shotType, shotNumber, keywords, shotName, timestamps, _schema, _completed)
- **Status:** User testing confirmed JSON read works correctly (November 2025)

#### **⚠️ XMP Write Capability (LIMITED - Adobe Constraints)**
- **Clip Name:** ✅ **RELIABLE** - Updates Premiere Pro Clip Name field consistently
- **Description:** ⚠️ **UNCERTAIN** - May persist, but Adobe XMP namespace constraints cause inconsistency
- **Other Fields:** ❌ **NOT SUPPORTED** - Full JSON round-trip write not implemented

#### **Reality-Validated Behavior (User Testing - November 2025):**
```
Test Results:
  ✅ JSON metadata loads into CEP Panel correctly
  ✅ Clip Name updates persist to Premiere Pro
  ⚠️ Description field persistence is inconsistent (Adobe XMP limitation)
  ✅ Lock indicator (_completed: true) displays correctly
  ✅ Error handling works (missing JSON, malformed format)
```

#### **Production Use Case:**
CEP Panel is a **metadata viewer/editor** - reads from JSON sidecar, allows limited Premiere Pro Clip Name updates. Full metadata persistence managed by ingest-assistant via JSON file updates.

**Legacy XMP Approach (Deprecated):**
Previously attempted full XMP read/write using `xmpDM:shotName`, `xmpDM:LogComment`, `dc:description`. Namespace collision issues and Adobe XMP constraints made this impractical. Superseded by JSON sidecar strategy (Schema 2.0).

---

## 📋 Production Workflow

**Overview:** CEP Panel handles Steps 3-5 (Premiere Pro import, batch processing, QC workflow). Steps 1-2 (CFex transfer + AI cataloging) handled by Ingest Assistant.

### Steps 1-2: Upstream Processing (Ingest Assistant)

**Brief Overview (CEP Panel perspective):**

**Step 1: CFex File Transfer**
- IA extracts media files from CFex card
- Writes Tape Name metadata: `-XMP-xmpDM:TapeName={original-filename}`
- Files placed in image/raw video folders

**Step 2: AI Cataloging**
- IA analyzes files with AI (location, subject, action, shotType)
- **Processes either:** Raw footage (Ubuntu) OR Proxies (macOS LucidLink)
- Creates `.ingest-metadata.json` sidecar in same folder as media files
- Assigns sequential shot numbers (#1, #2, #3...) based on chronological order
- Marks folder COMPLETE → locks metadata and shot numbers
- **Note:** IA runs on both macOS and Ubuntu platforms

**JSON Sidecar Output:**
- File: `.ingest-metadata.json` (co-located with media files)
- Format: Schema 2.0 (see CEP Panel North Star for full spec)
- Key: Original filename without extension (EA001621)
- Contains: location, subject, action, shotType, shotNumber, keywords, timestamps

**For detailed IA workflow, see:** `/Volumes/HestAI-Projects/ingest-assistant/CLAUDE.md`

---

### Step 3: Import to Premiere Pro (Editor Workflow)

**Purpose:** Import media files and attach proxies for editing

**Process:**
1. **Import Raw Footage:**
   - File → Import → Select raw video folder (e.g., `/Ubuntu/EAV014/videos-raw/shoot1-20251124/`)
   - Import all files to Premiere Pro Project Panel

2. **Attach Proxies:**
   - Right-click raw clip → Proxy → Attach Proxies
   - Select corresponding proxy file from `/LucidLink/EAV014/videos-proxy/shoot1-20251124/`
   - PP creates proxy link (raw remains in archive, editor works with proxy)

3. **Verify Tape Name:**
   - Check PP Tape Name column = original filename (EA001621)
   - This field is **immutable** and used by CEP Panel for metadata lookup

**Why Proxies:**
- Raw footage on archive volume (often offline)
- Proxies on LucidLink (online, fast access)
- Metadata workflows use proxies, final export uses raw

---

### Step 4: Metadata Review via CEP Panel (PRODUCTION READY)

**Purpose:** View and edit clip metadata from JSON sidecar files

**Current State:** ✅ **JSON READ WORKING** - CEP Panel reads `.ingest-metadata.json` successfully
**Future State:** Batch update functionality for multiple clips simultaneously

**Current Process (Per-Clip Review):**
1. **Open Metadata Panel:** Window → Extensions → EAV Ingest Assistant - Metadata

2. **Select Clip:** Click clip in Navigation Panel OR Project Panel
   - CEP Panel automatically loads metadata from `.ingest-metadata.json`
   - Lookup by PP Tape Name (e.g., EA001621)
   - All fields populate: location, subject, action, shotType, shotNumber, keywords

3. **Review and Edit:**
   - View AI-generated metadata
   - Make corrections if needed
   - Generated shotName updates live: `{location}-{subject}-{action}-{shotType}-#{shotNumber}`

4. **Apply to Premiere:**
   - Click "Apply to Premiere" button
   - Updates PP Clip Name (reliable)
   - Description field (uncertain persistence - Adobe XMP limitation)

**Result:**
- PP Clip Name: `kitchen-oven-cleaning-ESTAB-#25`
- Editor sees meaningful names instead of camera filenames (`EA001621_proxy.mov`)
- Timeline navigation significantly faster

**Future Enhancement (Batch Update):**
Batch operation to update multiple clips simultaneously from JSON. Currently requires per-clip review/apply workflow.

---

### Step 5: QC Review & Metadata Correction (CEP Panel)

**Purpose:** Human review of AI-generated metadata with corrections

**Process:**
1. **Open CEP Panel:** Window → Extensions → EAV Ingest Assistant - Metadata

2. **Load Clip Metadata:**
   - **Current (JSON-based - WORKING):** CEP reads `.ingest-metadata.json` by PP Tape Name lookup
   - **Legacy (XMP-based - Deprecated):** Previously read XMP from file (namespace issues)

3. **Review AI Analysis:**
   - Check location, subject, action, shotType fields
   - Verify sequential shot number is correct
   - Correct any AI errors (wrong subject, incorrect action, etc.)

4. **Make Corrections:**
   - Edit fields in CEP Panel form
   - Click "Apply to Premiere" button
   - **Current:** Updates PP Clip Name (reliable) + Description (uncertain)
   - **Future:** Updates JSON sidecar + optional Supabase sync

5. **JSON Lock Mechanism (Future):**
   - If IA folder marked COMPLETE → JSON `lockedFields: []` prevents IA from overwriting QC corrections
   - QC corrections preserved even if IA re-runs on folder

**Offline Workflow (Future):**
- QC person can edit metadata when proxy volume offline
- CEP Panel caches metadata in IndexedDB
- When online → sync queue uploads changes to JSON file
- No database dependency for core QC operations

**Success Criteria (Current Reality - November 2025):**
- ✅ CEP Panel reads JSON sidecar successfully (Schema 2.0)
- ✅ Metadata displays correctly in Premiere Pro
- ✅ Clip Name updates persist reliably
- ⚠️ Description field persistence uncertain (Adobe XMP limitation)
- ❌ JSON write-back not implemented (future enhancement)
- ❌ Lock mechanism not implemented (future enhancement)

**Implementation Status:** **JSON READ - PRODUCTION READY** (Track A complete, November 2025)

---

### Future Enhancement: Supabase Shot List Reference (3-6 months)

**Current State:** QC person corrects metadata manually without shoot planning context

**Future State:** CEP Panel displays planned shots from Supabase `public.shots` table
- Shot planning creates expected shot list (kitchen-oven-cleaning-ESTAB)
- CEP Panel shows dropdown: "Planned shots for this shoot: 15 remaining"
- QC person can match actual footage to planned shots
- Improves accuracy and speed (select from list vs. type fields manually)

**Implementation:** Requires Supabase integration with shot list pull

**Status:** Deferred 3-6 months (see GitHub Issue for Supabase guardrails)

---

## 🔧 ExtendScript Loading (CRITICAL - November 2025)

**Problem Solved:** CEP panels were not loading jsx/host.jsx due to multiple issues.

### Issue 1: ScriptPath in manifest.xml Doesn't Work

**Symptom:** `typeof EAVIngest` returns `undefined` in ExtendScript Console
**Cause:** `<ScriptPath>./jsx/host.jsx</ScriptPath>` in manifest.xml doesn't reliably auto-load
**Solution:** Manually load via JavaScript in panel init()

### Issue 2: CSInterface.evalFile() Callback Never Fires

**Symptom:** Panel stuck after "Loading ExtendScript..." with no further output
**Cause:** CSInterface.evalFile() is unreliable - callback silently never executes (known CEP bug)
**Solution:** Use $.evalFile() via csInterface.evalScript() instead

### Issue 3: @include Directive Doesn't Work with $.evalFile()

**Symptom:** `SyntaxError: Syntax error at line 210`
**Cause:** @include is a preprocessor directive (ExtendScript Toolkit only), not runtime
**Solution:** Replace @include with runtime $.evalFile() loading

### Issue 4: jsx/generated/ Folder Not Deployed

**Symptom:** `IOError: File or folder does not exist at line 207`
**Cause:** Deploy scripts didn't copy jsx/generated/track-a-integration.jsx
**Solution:** Updated deploy-navigation.sh and deploy-metadata.sh to copy jsx/generated/

### Current Working Solution (Lines in js/navigation-panel.js and js/metadata-panel.js)

```javascript
// Load ExtendScript manually (CSInterface.evalFile doesn't work reliably)
const extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
const jsxPath = extensionRoot + '/jsx/host.jsx';
addDebug('[Init] Loading ExtendScript: ' + jsxPath);

// Use $.evalFile() directly (more reliable than CSInterface.evalFile)
csInterface.evalScript('$.evalFile("' + jsxPath + '"); "loaded"', function(result) {
  addDebug('[Init] Load result: ' + result);

  // Check if EAVIngest is now available
  csInterface.evalScript('typeof EAVIngest', function(typeResult) {
    addDebug('[Init] typeof EAVIngest: ' + typeResult);

    if (typeResult === 'object') {
      addDebug('[Init] ✓ ExtendScript loaded successfully');
      ClipBrowser.init();  // Initialize AFTER ExtendScript loads
      addDebug('✓ ClipBrowser initialized');
      addDebug('=== Navigation Panel Ready ===');
    } else {
      addDebug('[Init] ✗ ExtendScript load failed - EAVIngest not available', true);
      addDebug('[Init] Check jsx/host.jsx for syntax errors', true);
    }
  });
});
```

**Key Points:**
- Load jsx/host.jsx via csInterface.evalScript() with $.evalFile()
- Wait for callback before initializing ClipBrowser/MetadataForm
- Verify EAVIngest available with typeof check
- jsx/generated/track-a-integration.jsx loaded via runtime $.evalFile() in jsx/host.jsx

**Expected Debug Output:**
```
[Init] Loading ExtendScript: /path/to/jsx/host.jsx
[Init] Load result: loaded
[Init] typeof EAVIngest: object
[Init] ✓ ExtendScript loaded successfully
✓ ClipBrowser initialized
=== Navigation Panel Ready ===
```

---

## 🚀 Deployment Workflow

### **Deploy Both Panels**
```bash
cd /Volumes/HestAI-Projects/eav-cep-assist
./deploy-navigation.sh && ./deploy-metadata.sh
```

### **Deployment Targets**
- **Navigation:** `~/Library/Application Support/Adobe/CEP/extensions/eav-navigation-panel/`
- **Metadata:** `~/Library/Application Support/Adobe/CEP/extensions/eav-metadata-panel/`

### **After Deployment**
1. Quit Premiere Pro (Cmd+Q)
2. Reopen Premiere Pro
3. Window → Extensions → EAV Ingest Assistant - Navigation
4. Window → Extensions → EAV Ingest Assistant - Metadata

**CRITICAL:** Both panels share `jsx/host.jsx` - deploying EITHER panel updates ExtendScript for BOTH.

---

## 🧪 Testing Workflow

### **Basic Smoke Test**
1. Open Navigation Panel → should show clips with search/filter
2. Click a clip → should open in Source Monitor
3. Metadata Panel → should auto-load clip data
4. Edit fields → Generated Name should update
5. Click "Apply to Premiere" → Green checkmark appears
6. Click clip again → Fields should persist (Description, Location, Subject, Action, Shot Type)

### **XMP Persistence Test (Critical)**
```
1. Select clip EA001601.MOV
2. Fill fields:
   - Identifier: EA001601.MOV
   - Description: kitchen, spur-switch, appliances
   - Location: kitchen
   - Subject: spur-switch
   - Action: opening
   - Shot Type: ESTAB
3. Apply to Premiere → Wait for green checkmark
4. Click DIFFERENT clip → Fields should clear
5. Click EA001601.MOV again → ALL fields should reload with exact values
```

**If Description is empty or Location/Subject are corrupted → XMP namespace bug (check ExtendScript console).**

---

## 📂 Key Files & Responsibilities

### **ExtendScript Layer (`jsx/host.jsx`)**
- `getSelectedClips()` → Read Project Panel selection
- `getAllProjectClips()` → Load all clips for Navigation Panel (XMP read)
- `updateClipMetadata()` → Write XMP metadata (namespace-aware, lines 177-447)
- `selectClip()` → Select clip in Project Panel
- `openInSourceMonitor()` → Open clip in Source Monitor

### **Metadata Panel (`js/metadata-panel.js`)**
- `loadClipIntoForm()` → Populate form fields
- `applyMetadata()` → Send data to ExtendScript
- `updateGeneratedName()` → Live preview of structured naming
- `setupSearchableDropdown()` → Shot Type dropdown with validation

### **Navigation Panel (`js/navigation-panel.js`)**
- `loadAllClips()` → Fetch clips via ExtendScript
- `filterClips()` → Search + Video/Image/Tagged filters
- `handleClipClick()` → Dispatch CEP event to Metadata Panel
- XMP warm-up delay (1.5s on first load prevents "EMPTY" metadata bug)

### **Deployment Scripts**
- `deploy-metadata.sh` → Deploy Metadata Panel
- `deploy-navigation.sh` → Deploy Navigation Panel
- Both copy `jsx/host.jsx` (shared ExtendScript layer)

---

## 🔧 Common Issues & Diagnostics

### **Issue: "EMPTY" Metadata on First Load**
- **Cause:** Premiere Pro XMP cache not initialized
- **Fix:** 1.5s warm-up delay in `js/navigation-panel.js:XMP_WARM_UP_DELAY`
- **Debug:** Check for `[ClipBrowser] Waiting for XMP metadata to load...`

### **Issue: Description Not Saving**
- **Cause:** XMP namespace collision (Dublin Core vs. XMP namespace)
- **Fix:** Namespace-aware block manipulation in `jsx/host.jsx:187-443`
- **Debug:** Check ExtendScript console for `dc:description updated`

### **Issue: Location/Subject Corruption**
- **Cause:** All fields inserted before FIRST `</rdf:Description>` tag (wrong namespace)
- **Fix:** Separate Dublin Core and XMP namespace blocks
- **Debug:** Check for `xmp:Location updated`, `xmp:Subject updated` (not overwriting each other)

### **Issue: Green Checkmark Not Appearing**
- **Cause:** `updateClipMetadata()` failed or returned error
- **Debug:** Check ExtendScript console for error messages
- **Also Check:** Metadata Panel console for `[MetadataForm] ✓ Updated: {name}`

### **Issue: Navigation Panel Shows 0 Clips**
- **Cause:** `getAllProjectClips()` error or no clips in project
- **Debug:** ExtendScript console shows `getAllProjectClips failed`
- **Also Check:** Navigation Panel console for `[ClipBrowser] ✓ Loaded X clips`

---

## 🔄 ML Feedback Loop (PP Edits Tracking)

The CEP panel writes **two outputs** when "Apply to Premiere" is clicked:

### **1. XMP Metadata (Embedded in File)**
- `xmpDM:shotName` → Combined name for PP Shot field
- `xmpDM:logComment` → Structured key=value pairs
- `dc:description` → Keywords/tags

### **2. PP Edits JSON (Original Folder)**
Writes `.ingest-metadata-pp.json` to the original media folder for ML feedback:

**File Location:**
```
/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/
├── EA001932.MOV
├── .ingest-metadata.json          ← IA original (AI-generated)
└── .ingest-metadata-pp.json       ← PP edits (human-corrected)
```

**JSON Format (Matches IA Schema 2.0):**
```json
{
  "_schema": "2.0",
  "EA001932": {
    "id": "EA001932",
    "originalFilename": "EA001932.MOV",
    "currentFilename": "EA001932.MOV",
    "filePath": "/Volumes/EAV_Video_RAW/.../EA001932.MOV",
    "extension": ".MOV",
    "fileType": "video",

    "mainName": "hallway-front-door-safety-chain-CU",
    "keywords": ["door", "chain", "lock"],

    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",
    "shotType": "CU",

    "processedByAI": true,

    "createdAt": "2025-11-12T10:00:00.000Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-12T15:30:00.000Z",
    "modifiedBy": "cep-panel",
    "version": "1.0.0"
  }
}
```

### **Workflow Integration:**

1. **IA processes files** → Writes `.ingest-metadata.json` (AI-generated)
2. **Import to PP** → Metadata survives via XMP
3. **Editor reviews** → Corrects metadata via CEP panel
4. **CEP writes edits** → Updates `.ingest-metadata-pp.json` (human-corrected)
5. **Compare JSONs** → Generate diff for ML training
6. **Feed back to model** → Improve AI prompts/accuracy

**Implementation:** `jsx/host.jsx:553-737` (PP edits JSON writer)

### **Comparison Script Example:**

```bash
#!/bin/bash
# compare-metadata.sh - Generate diff for ML training

FOLDER="/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103"
IA_JSON="$FOLDER/.ingest-metadata.json"
PP_JSON="$FOLDER/.ingest-metadata-pp.json"

jq -s '
  .[0] as $ia | .[1] as $pp |
  ($ia | keys) as $ids |
  $ids | map({
    id: .,
    changes: (
      if ($ia[.].location != $pp[.].location) then
        {field: "location", ia: $ia[.].location, pp: $pp[.].location}
      elif ($ia[.].subject != $pp[.].subject) then
        {field: "subject", ia: $ia[.].subject, pp: $pp[.].subject}
      elif ($ia[.].action != $pp[.].action) then
        {field: "action", ia: $ia[.].action, pp: $pp[.].action}
      elif ($ia[.].shotType != $pp[.].shotType) then
        {field: "shotType", ia: $ia[.].shotType, pp: $pp[.].shotType}
      else null end
    )
  }) | map(select(.changes != null))
' "$IA_JSON" "$PP_JSON"
```

**Debug:** Check diagnostics panel for `[ExtendScript] PP edits JSON written: /path/to/.ingest-metadata-pp.json`

---

## ⚙️ ES3 Enforcement & Constraints

### **Why ES3?**
Adobe ExtendScript is based on **ECMAScript 3** (ES3, circa 1999). Modern JavaScript features (ES6+, from 2015) are **NOT supported** and will cause runtime errors in Premiere Pro.

### **Automated Enforcement**
This project uses **three-layer enforcement** to prevent ES6+ syntax from reaching production:

#### **1. Parser-Level Rejection (ESLint)**
- **Config:** `eslint.config.js` sets `ecmaVersion: 3` for `jsx/*.jsx` files
- **Behavior:** ES6+ syntax **fails parsing** immediately (strongest enforcement)
- **Example:**
  ```bash
  npm run lint
  # Error: Parsing error: Unexpected token FORBIDDEN_CONST (if ES6+ detected)
  ```

#### **2. Regression Detection (Validation Script)**
- **Script:** `scripts/validate-es3-enforcement.sh`
- **Behavior:** Proves ESLint catches violations by testing intentional ES6+ files
- **Runs in:** `npm run quality-gates` (automated CI validation)
- **Example:**
  ```bash
  npm run validate:es3
  # ✓ Parser correctly rejects ES6+ syntax
  # ✓ ESLint rules caught 16 violations
  ```

#### **3. Type Checking (TypeScript)**
- **Config:** `tsconfig.json` sets `target: "ES5"` (for transpilation guidance)
- **Behavior:** Catches **undefined globals** and type errors (NOT ES6+ syntax enforcement)
- **Note:** TypeScript ACCEPTS ES6 syntax when targeting ES5 (it transpiles, doesn't reject)
- **Example:**
  ```bash
  npm run typecheck
  # Error: Cannot find name 'console' (undefined global)
  # (Does NOT reject const/let/arrow - those would transpile)
  ```

### **Forbidden ES6+ Constructs**

| **ES6+ Feature** | **ES3 Replacement** |
|------------------|---------------------|
| `const x = 1;` | `var x = 1;` |
| `let x = 1;` | `var x = 1;` |
| `() => {}` | `function() {}` |
| `` `template ${x}` `` | `'string ' + x` |
| `{a, b} = obj` | `var a = obj.a; var b = obj.b;` |
| `[a, b] = arr` | `var a = arr[0]; var b = arr[1];` |
| `func(x = 'default')` | `function func(x) { x = x \|\| 'default'; }` |
| `[...arr1, ...arr2]` | `arr1.concat(arr2)` |
| `console.log()` | (Not available - ExtendScript has no console) |
| `Array.forEach()` | `for (var i = 0; i < arr.length; i++)` |

### **Validation Test Files**
The project includes test files to prove enforcement works:

- **`jsx/test-es3-violations.jsx`** - Parser-level rejection (const, let, arrow, template literals)
- **`jsx/test-es3-rule-violations.jsx`** - Rule-level detection (console, ==, missing braces)

**Automated Validation (runs in CI):**
```bash
npm run validate:es3
# ✓ Parser correctly rejects ES6+ syntax
# ✓ ESLint rules caught 16 violations (expected 10+)
```

**Manual Verification:**
```bash
npx eslint --no-ignore jsx/test-es3-violations.jsx        # Should show parser error
npx eslint --no-ignore jsx/test-es3-rule-violations.jsx   # Should show 15+ rule errors
```

**Note:** Test files are excluded from production linting via:
- `eslint.config.js` → `ignores: ['jsx/test-es3-*.jsx']`
- `tsconfig.json` → `exclude: ['jsx/test-es3-*.jsx']`

BUT validation runs EXPLICITLY in quality gates via `npm run validate:es3` (ensures enforcement proof runs every CI build).

### **Common Violations & Fixes**

#### **❌ WRONG (ES6+):**
```javascript
const selectedClip = app.project.activeSequence.videoTracks[0].clips[0];
var processClip = (clip) => {
  return `Processing ${clip.name}`;
};
```

#### **✓ CORRECT (ES3):**
```javascript
var selectedClip = app.project.activeSequence.videoTracks[0].clips[0];
var processClip = function(clip) {
  return 'Processing ' + clip.name;
};
```

### **Debugging ES3 Violations**

1. **Lint fails with "Unexpected token" → Parser-level rejection**
   - Fix: Replace ES6+ syntax with ES3 equivalent
   - Verify: `npm run lint jsx/your-file.jsx`

2. **TypeScript error "Cannot find name 'X'" → Undefined global**
   - Check: Is `X` defined in ExtendScript globals? (See `eslint.config.js` lines 54-67)
   - Fix: Add to `globals` if legitimate Adobe API

3. **Premiere Pro runtime error → Syntax passed linting but fails at runtime**
   - **ESCALATE** - This indicates a gap in ES3 enforcement
   - Report to holistic-orchestrator for tooling fix

### **Quality Gate Requirements**
All ExtendScript changes MUST pass:
```bash
npm run quality-gates
# ✓ lint        - Production code ES3 compliance (parser rejects ES6+)
# ✓ validate:es3 - Regression detection (proves ESLint catches violations)
# ✓ typecheck    - Undefined globals + type errors (NOT ES6+ enforcement)
# ✓ test         - Unit + integration tests
```

**Enforcement Hierarchy:**
1. **Primary:** ESLint parser (`ecmaVersion: 3`) rejects ES6+ syntax in production code
2. **Validation:** `validate:es3` script proves enforcement works by testing violation files
3. **Supplementary:** TypeScript catches undefined globals (e.g., `console` in ExtendScript)

**Critical:** If `validate:es3` fails, it means ESLint is NOT catching ES3 violations (regression detected). TypeScript does NOT enforce ES3 compliance - it only provides type hints.

**Last Updated:** 2025-11-15 (B2.0 ES3 validation - code review corrections)

---

## 📚 Documentation Structure

- **`CLAUDE.md`** ← You are here (operational guide for AI)
- **`.coord/PROJECT-CONTEXT.md`** → Project identity, tech stack, pipeline position
- **`.coord/ECOSYSTEM-POSITION.md`** → Where this tool fits in EAV production pipeline
- **`.coord/workflow-docs/003-QUICK_REFERENCE-NEXT_SESSION.md`** → Session handoff notes
- **`.coord/workflow-docs/002-CEP_PANEL_CURRENT_STATE-BUILD-STATUS.md`** → Build status

---

## 🎯 When Diagnosing Issues

### **Always Ask For (PRIMARY SOURCES):**
1. **Metadata Panel console** (right-click → Debug → Console tab) ← **PRIMARY**
2. **Navigation Panel console** (right-click → Debug → Console tab) ← **PRIMARY**
3. Screenshots (before/after if visual issue)

**⚠️ DO NOT ask for ExtendScript Console** - it's empty by default (no automatic output)

### **Optional Manual ExtendScript Testing:**
If CEP panel console shows "EvalScript error" or "JSON Parse error", test ExtendScript manually:

**Open:** Premiere Pro → Help → Console (Cmd+F12)

**Paste and run:**
```javascript
// Test 1: Is EAVIngest loaded?
typeof EAVIngest
// Expected: "object"

// Test 2: Test getAllProjectClips
EAVIngest.getAllProjectClips()
// Expected: JSON string with clips array

// Test 3: Test readJSONMetadataByNodeId
EAVIngest.readJSONMetadataByNodeId("123")
// Expected: JSON string or "null"
```

### **Debugging Checklist:**
- [ ] Check **CEP panel consoles** (Metadata + Navigation)
- [ ] Look for `✗` error markers in panel consoles
- [ ] Check for `typeof EAVIngest: EvalScript error` (indicates ExtendScript crash)
- [ ] Check for `JSON Parse error` (ExtendScript returning error string, not JSON)
- [ ] Check XMP warm-up delay completed (`Waiting for XMP metadata...`)
- [ ] Verify both panels deployed (check deployment timestamps)
- [ ] Confirm Premiere Pro restarted after deployment
- [ ] If errors persist, manually test ExtendScript functions (see above)

---

## 🚨 Critical Constraints

1. **ExtendScript is ES3** (no arrow functions, no `const`/`let`, no template literals)
2. **Both panels share `jsx/host.jsx`** (changes affect both panels)
3. **XMP namespace awareness required** (Dublin Core ≠ XMP namespace)
4. **CEP event system** (panels communicate via `CSInterface.dispatchEvent()`)
5. **Adobe debugging** (right-click panel → Debug opens Chromium DevTools)

---

**Last Updated:** 2025-11-11 (after XMP namespace bug fix)
