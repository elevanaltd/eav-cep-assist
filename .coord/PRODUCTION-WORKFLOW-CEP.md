# Production Workflow (CEP Panel) - TO BE MERGED INTO CLAUDE.md

**Insert this section AFTER the "Metadata Strategy" section and BEFORE the "🚀 Deployment Workflow" section**

---

## Production Workflow

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

### Step 4: Batch Clip Name Update (CEP Panel - NEW WORKFLOW)

**Purpose:** Update PP Clip Names from JSON metadata in bulk

**Current State:** ⚠️ **NOT IMPLEMENTED** - Requires JSON sidecar read integration
**Future State:** CEP Panel reads `.ingest-metadata.json` and batch-updates PP

**Future Process:**
1. **Select All Clips:** In Project Panel, select all clips from shoot folder

2. **CEP Panel Batch Operation:**
   - Click "Batch Update from JSON" button (future feature)
   - CEP finds `.ingest-metadata.json` in proxy folder
   - For each clip:
     - Lookup by PP Tape Name (e.g., EA001621)
     - Read metadata from JSON
     - Update PP Clip Name to shotName format: `{location}-{subject}-{action}-{shotType}-#{shotNumber}`

3. **Result:**
   - PP Clip Name: `kitchen-oven-cleaning-ESTAB-#25`
   - PP Metadata columns populated (location, subject, action, shotType, shotNumber)
   - Editor sees meaningful clip names in timeline

**Why This Matters:**
Editors work with descriptive names (`kitchen-oven-cleaning-ESTAB-#25`) instead of camera filenames (`EA001621_proxy.mov`), making timeline navigation 10x faster.

**Implementation Status:** Requires JSON sidecar read functionality (not yet implemented)

---

### Step 5: QC Review & Metadata Correction (CEP Panel)

**Purpose:** Human review of AI-generated metadata with corrections

**Process:**
1. **Open CEP Panel:** Window → Extensions → EAV Ingest Assistant - Metadata

2. **Load Clip Metadata:**
   - **Current (XMP-based):** CEP reads XMP from file
   - **Future (JSON-based):** CEP reads `.ingest-metadata.json` by PP Tape Name lookup

3. **Review AI Analysis:**
   - Check location, subject, action, shotType fields
   - Verify sequential shot number is correct
   - Correct any AI errors (wrong subject, incorrect action, etc.)

4. **Make Corrections:**
   - Edit fields in CEP Panel form
   - Click "Apply to Premiere" button
   - **Current:** Updates PP + writes XMP
   - **Future:** Updates PP + writes JSON + optional Supabase sync

5. **JSON Lock Mechanism (Future):**
   - If IA folder marked COMPLETE → JSON `lockedFields: []` prevents IA from overwriting QC corrections
   - QC corrections preserved even if IA re-runs on folder

**Offline Workflow (Future):**
- QC person can edit metadata when proxy volume offline
- CEP Panel caches metadata in IndexedDB
- When online → sync queue uploads changes to JSON file
- No database dependency for core QC operations

**Success Criteria:**
- All metadata corrections persist to JSON (source of truth)
- CEP Panel can read/write JSON even when Supabase unavailable
- Lock mechanism prevents IA from clobbering QC work

**Implementation Status:** Currently XMP-based, migrating to JSON sidecar per CEP Panel North Star (D1 complete)

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
