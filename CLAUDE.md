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
