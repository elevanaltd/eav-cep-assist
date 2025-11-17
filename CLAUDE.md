# CEP Panel - Claude Assistant Guide

**Purpose:** Operational knowledge for AI assistance on this Adobe Premiere Pro CEP extension project.

---

## 🔍 Debug Console Access (CRITICAL)

This project has **multiple debug consoles** - you need visibility into all of them for effective diagnosis.

### **1. ExtendScript Console (Premiere Pro)**
- **Location:** Premiere Pro → Help → Console (or Cmd+F12 on macOS)
- **Shows:** JSX layer execution (`jsx/host.jsx`)
- **Key Prefixes:**
  - `DEBUG SAVE:` → XMP metadata write operations
  - `DEBUG XMP ERROR:` → XMP read/write failures
  - `DEBUG:` → General ExtendScript execution

**When diagnosing issues, ALWAYS ask user to copy/paste ExtendScript console output.**

### **2. Metadata Panel Console (CEP - Browser DevTools)**
- **Location:** Right-click Metadata Panel → Debug (opens Chromium DevTools)
- **Shows:** `js/metadata-panel.js` execution
- **Key Prefixes:**
  - `[MetadataForm]` → Form operations (load, save, navigation)
  - `✓` → Success operations
  - `✗` → Error operations
  - `▶` → Navigation actions

### **3. Navigation Panel Console (CEP - Browser DevTools)**
- **Location:** Right-click Navigation Panel → Debug (opens Chromium DevTools)
- **Shows:** `js/navigation-panel.js` execution
- **Key Prefixes:**
  - `[ClipBrowser]` → Clip loading and filtering
  - `[XMP]` → XMP warm-up delay and cache operations

### **How to Request Diagnostics:**
```
"Please copy/paste the following:
1. ExtendScript Console output (Premiere Pro → Help → Console)
2. Metadata Panel console (right-click panel → Debug → Console tab)
3. Navigation Panel console (right-click panel → Debug → Console tab)"
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


### **Metadata Strategy (Shared with ingest-assistant)**

This project uses a **shared XMP metadata strategy** with `ingest-assistant` (Electron desktop app). Both tools write **identical XMP fields** to video files, ensuring metadata consistency across the video production workflow.

**See:** [`ingest-assistant/.coord/docs/000001-DOC-METADATA-STRATEGY-SHARED.md`](../ingest-assistant/.coord/docs/000001-DOC-METADATA-STRATEGY-SHARED.md) for complete field specifications, namespace rationale, and implementation details.

**Key XMP Fields Written:**
- `xmpDm:shotName` - Combined entity mapping to PP Shot field (survives proxy workflows)
- `xmpDM:LogComment` - Structured key=value pairs for CEP panel parsing (**CRITICAL:** Capital 'C' in LogComment)
- `dc:description` - Human description or keywords (universal compatibility)

**Technology:** XMPScript API (Adobe ExtendScript) via `jsx/host.jsx` (lines 371-535)

**⚠️ KNOWN BUG (Pre-XMPScript Migration):** Current regex implementation uses `xmpDm:logComment` (lowercase 'c') instead of `xmpDM:LogComment` (capital 'C'). This writes to a DIFFERENT field than ingest-assistant, breaking metadata alignment. Fix required during XMPScript SDK migration.

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

### **Always Ask For:**
1. ExtendScript Console output (Premiere Pro → Help → Console)
2. Metadata Panel console (right-click → Debug)
3. Navigation Panel console (right-click → Debug)
4. Screenshots (before/after if visual issue)

### **Debugging Checklist:**
- [ ] Check all three console outputs
- [ ] Verify `DEBUG SAVE:` lines show correct namespace (`dc:` vs `xmp:`)
- [ ] Look for `✗` error markers in panel consoles
- [ ] Check XMP warm-up delay completed (`Waiting for XMP metadata...`)
- [ ] Verify both panels deployed (check deployment timestamps)
- [ ] Confirm Premiere Pro restarted after deployment

---

## 🚨 Critical Constraints

1. **ExtendScript is ES3** (no arrow functions, no `const`/`let`, no template literals)
2. **Both panels share `jsx/host.jsx`** (changes affect both panels)
3. **XMP namespace awareness required** (Dublin Core ≠ XMP namespace)
4. **CEP event system** (panels communicate via `CSInterface.dispatchEvent()`)
5. **Adobe debugging** (right-click panel → Debug opens Chromium DevTools)

---

**Last Updated:** 2025-11-11 (after XMP namespace bug fix)
