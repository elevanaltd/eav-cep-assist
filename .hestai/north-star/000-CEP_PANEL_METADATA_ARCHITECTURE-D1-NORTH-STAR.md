# CEP Panel Metadata Architecture - North Star

**PROJECT:** CEP Panel Metadata Redesign
**SCOPE:** Shift from XMP-based to JSON-sidecar metadata with Supabase coordination
**STATUS:** ✅ APPROVED (2025-11-18, Binding Authority)
**ECOSYSTEM POSITION:** Step 7 of 10 in EAV Production Pipeline | Bridge between Ingest Assistant (Step 6) and Editor Workflow

---

## **SYSTEM IMMUTABLES (Grounded in Universal North Star)**

### **I5: Offline-Capable Mobile Operations**
CEP Panel QC workflow must function when original raw footage volume is offline (common production scenario: raw files on archive volume, proxies + metadata on local/LucidLink).

**Implementation:** Metadata stored in sidecar JSON files co-located with media files (not dependent on Supabase availability for QC operations).

### **I7: Test-Driven Development with RED State Discipline**
Every metadata round-trip feature begins with failing test (RED→GREEN→REFACTOR).

**Implementation:** Metadata read/write tests mock JSON files before touching production CEP Panel code.

### **I8: Production-Grade Quality from Day One**
CEP Panel changes meet production standards: zero data corruption risk, deterministic metadata syncing, no "migration period" fragility.

**Implementation:** Lock mechanism prevents competing writes (IA vs QC), atomic JSON updates, version tracking.

### **I10: Cross-App Data Consistency via Database Layer (OPTIONAL)**
During active production, Supabase MAY coordinate metadata workflow for real-time dashboards and reporting. However, this is not required—JSON sidecar is the source of truth and works offline.

**Implementation:** If Supabase available: CEP Panel writes to Supabase AND JSON sidecar (best-effort async). If Supabase unavailable: JSON writes succeed independently, Supabase sync skipped.

### **I11: Independent Deployment Architecture**
CEP Panel deploys independently without requiring Ingest Assistant changes first.

**Implementation:** CEP Panel reads/writes JSON format that IA will produce, tested against fixtures, verified against real IA output when available.

---

## **CORE REQUIREMENTS**

### **R1.1: JSON Metadata Format (LOCKED - Production Validated)**

**Status:** ✅ LOCKED (2025-11-18) - Validated against actual Premiere Pro integration test + User confirmation

**File Structure:**
```json
{
  "_schema": "2.0",
  "_completed": false,
  "EA001621": {
    "id": "EA001621",
    "originalFilename": "EA001621.MOV",
    "currentFilename": "EA001621.MOV",
    "filePath": "/path/to/file",
    "extension": ".MOV",
    "fileType": "video",

    "location": "kitchen",
    "subject": "oven",
    "action": "cleaning",
    "shotType": "ESTAB",
    "shotNumber": 25,

    "shotName": "kitchen-oven-cleaning-ESTAB-#25",
    "keywords": ["stainless-steel", "gas-range"],

    "processedByAI": true,
    "createdAt": "2025-11-18T14:30:00Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T15:45:00Z",
    "modifiedBy": "cep-panel",
    "version": "1.1.0",

    "lockedFields": [],
    "lockedBy": null,
    "lockedAt": null
  }
}
```

**Key Changes from R1.0:**
- ✅ Removed `description` field (IA only generates `keywords` array)
- ✅ Added `_completed` flag at root (IA COMPLETE button)
- ✅ Added `processedByAI` boolean (QC workflow signal)
- ✅ Changed to field-level locking (`lockedFields` array vs `locked` boolean)
- ✅ Confirmed `shotName` includes `#N` format

**See Complete Specification:** `.coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md`

**Key Design Decisions:**
- **Primary Key:** Original filename (EA001621), NOT PP Clip Name (survives PP renames)
- **Lock Mechanism:** `lockedFields` array prevents QC-to-IA overwrites
- **Immutable Fields:** `id`, `originalFilename`, `fileType` never change
- **Derived Field:** `shotName` computed from location/subject/action/shotType/shotNumber
- **Metadata Source:** Tracks who wrote each update (IA vs CEP vs manual lock)

### **R2: File Placement Strategy**

**Images:**
```
EAV014/images/shoot1-20251024/
├── EA001621.JPG
├── EA001622.JPG
└── .ingest-metadata.json          ← Contains all image metadata
```

**Videos:**
```
EAV014/videos-proxy/shoot1-20251024/
├── EA001621_proxy.mov
├── EA001622_proxy.mov
└── .ingest-metadata.json          ← Contains all video metadata
```

**Rationale:**
- Metadata travels with media through all storage migrations (LucidLink → Ubuntu → Archive)
- Editors + QC never need to navigate elsewhere for metadata
- No symbolic links or external references needed
- Simple parallel: # files in raw ≈ # files in proxy, all reference same `.ingest-metadata.json`

### **R3: Metadata Read Workflow (CEP Panel)**

**When user selects clip in Premiere Pro:**

1. **Extract Identifier:** Get original filename from PP Tape Name (immutable, set at import)
   - Example: PP Tape Name = "EA001621" → Use as JSON key

2. **Find Metadata File:**
   - Metadata file is **always in the same folder as the media files** (e.g., video-proxy/shoot1-20251024/)
   - Extract directory from clip path, look for `.ingest-metadata.json` in same folder
   - If offline or file unavailable: Use IndexedDB cache
   - Example:
     ```
     Media: /EAV014/videos-proxy/shoot1-20251024/EA001621_proxy.mov
     Metadata: /EAV014/videos-proxy/shoot1-20251024/.ingest-metadata.json ← SAME FOLDER
     ```

3. **Load & Display:**
   - Read JSON from file OR cache
   - Hydrate form fields (location, subject, action, shotType, shotNumber, description)
   - Display lock status (if locked, show "LOCKED by [user]")
   - Compute shotName display: `{location}-{subject}-{action}-{shotType}-{shotNumber}`

4. **Offline Handling:**
   - CEP Panel caches metadata in IndexedDB on first load
   - User edits offline: Writes to IndexedDB only
   - When online: Sync queue uploads changes to JSON file + Supabase

### **R4: Metadata Write Workflow (CEP Panel)**

**When user clicks "Apply to Premiere":**

1. **Validate Input:**
   - Ensure location, subject, action, shotType, shotNumber are populated
   - Compute shotName (validate against PP field)
   - Check lock status (if locked, prevent override)

2. **Update PP:**
   - Set PP Clip Name to `{location}-{subject}-{action}-{shotType}-{shotNumber}`
   - Update PP Metadata columns (location, subject, action, shotType, shotNumber, description)

3. **Update JSON File (REQUIRED - Critical Path):**
   - Read current `.ingest-metadata.json` from disk
   - Locate record by original filename (EA001621)
   - Merge updates (preserve locked fields, update others)
   - Write atomically (write to temp file, then rename)
   - Log: `modifiedBy: "cep-panel"`, `modifiedAt: timestamp`
   - **This update MUST succeed for workflow to continue**

4. **Update Supabase (OPTIONAL - Best-Effort):**
   - If Supabase available: POST to metadata API endpoint (async, no blocking)
   - If Supabase unavailable or offline: Skip (JSON is authoritative)
   - If fails: Log warning, don't block user (JSON already persisted)

5. **Visual Confirmation:**
   - Show green checkmark: "✓ Updated: {location} {subject}"
   - If offline: Show "⏳ Pending sync (will save when online)"

### **R5: Ingest Assistant Integration Contract**

**What IA Must Provide:**
- Write `.ingest-metadata.json` to image/proxy folder after initial file transfer
- Include all fields from R1 (location, subject, action, shotType, shotNumber, description, keywords)
- Set `createdBy: "ingest-assistant"`, `lockedFields: []` (unlocked for QC)
- Generate initial `shotName` from AI-generated values
- Validate file structure matches schema 2.0

**What CEP Panel Expects:**
- JSON file exists in **the same folder as media files** (e.g., video-proxy/shoot1-20251024/.ingest-metadata.json)
- Key format matches original filename without extension (EA001621, not EA001621.MOV)
- Lock array respected (don't overwrite locked fields)
- `modifiedAt` timestamp used for conflict detection (last-write-wins)

**Schema Contract:**
- File: `.ingest-metadata.json` (dot-prefixed, always in media folder)
- Encoding: UTF-8 JSON (no BOM)
- Location validation: Must exist before CEP Panel can read
- Atomic writes: Both tools use temp-file-then-rename pattern

### **R6: Lock & Conflict Resolution**

**Lock Lifecycle:**
1. **Unlocked (Default):** IA can overwrite any field, CEP can update
2. **QC Lock:** Person clicks "Lock" → All fields become immutable except by unlock
3. **Field-Level Lock (Future):** Can lock specific fields while unlocking others

**Conflict Handling:**
- **Same-user edit:** Last-write-wins (timestamp-based)
- **IA overwrites QC decision:** Prevented (checked against `lockedFields`)
- **Multiple QC people:** Timestamp order determines precedence (in production, only one QC person per shoot)

**Lock UI (CEP Panel):**
- Show: "🔒 LOCKED by shaunb at 2025-11-18 14:30"
- Button: "Unlock (requires admin)" (grayed if not QC person)
- After lock: Form fields read-only, "Edit" button disabled

---

## **ESSENTIAL FUNCTIONALITY (Non-Negotiable)**

### **F1: Metadata Round-Trip (Read → Edit → Write)**
User opens CEP Panel, selects clip, edits 3 fields, clicks Apply → Fields persist in JSON AND PP → User navigates away → Opens clip again → All 3 fields reload.

**Success Criteria:**
- Metadata persists to `.ingest-metadata.json` file
- PP columns show updated values
- Next reload shows identical values
- Works offline (no Supabase requirement)

### **F2: Offline-First QC Workflow**
User disconnects from network, edits 5 clips' metadata in CEP Panel, reconnects → All edits sync to JSON files.

**Success Criteria:**
- IndexedDB caches metadata on first load
- User can edit fully offline
- Offline edits show "⏳ Pending sync" indicator
- Automatic sync when online, no manual trigger
- No data loss on reconnect

### **F3: IA-CEP Data Alignment**
IA generates metadata (location=kitchen, subject=oven), CEP Panel reads it immediately, shows in form, user confirms/edits.

**Success Criteria:**
- IA writes JSON → CEP reads without file missing errors
- All IA-generated fields hydrate correctly
- CEP updates preserve IA data in archive (only override user-edited fields)

### **F4: Batch QC Workflow**
QC person opens 20 clips sequentially, corrects metadata for 15, clicks "Apply" on each → All changes persist, can restart without re-entering.

**Success Criteria:**
- CEP Panel navigation (Previous/Next) works with JSON persistence
- Each update atomic (no partial saves)
- Performance: <500ms per clip save
- No memory leaks with 20+ clips opened

### **F5: Lock Enforcement**
IA attempts to write metadata, CEP Panel locked the clip → IA skips locked fields, logs "skipped due to lock".

**Success Criteria:**
- Lock array prevents IA overwrite
- IA gets notification/log about skipped fields
- Unlocking allows IA to resume updates
- No silent data loss

---

## **VALUE PROPOSITIONS**

- **Editors Get Ground Truth:** PP columns show correct metadata from QC, not stale XMP
- **Archive Durability:** Metadata travels with files forever (independent of Supabase—works without DB)
- **QC Efficiency:** Offline editing + batch operations reduce metadata work by 70%
- **IA Validation:** JSON output creates verifiable IA quality (can diff original vs corrected)
- **System Coherence:** One metadata format (JSON) is source of truth, works with or without Supabase
- **No Database Dependency:** Unlike old XMP approach, works offline AND stays accurate in archive (Supabase optional for active project coordination only)

---

## **TECHNICAL CONSTRAINTS & REALITIES**

### **C1: ExtendScript Cannot Read Proxy XMP**
When using proxies, `clip.getXMPMetadata()` returns empty string. Solution: Never try to read XMP from proxies, only from JSON files.

**Design Response:** All metadata from JSON sidecar, never attempt XMP read on offline clips.

### **C2: PP Tape Name is Immutable Reference**
PP filename can change, but Tape Name persists. Use as metadata lookup key.

**Design Response:** Store original filename in Tape Name during import, CEP uses this for JSON key lookup.

### **C3: No Direct File Write API in CEP**
CEP Panel runs in restricted browser context, cannot directly write files. Solution: Use ExtendScript bridge to handle file I/O.

**Design Response:** CEP Panel → ExtendScript (jsx/host.jsx) → File system. Implement atomic write (temp → rename) in ExtendScript.

### **C4: Supabase is Optional, JSON is Mandatory**
Metadata must survive without database. Solution: JSON is sole source of truth, Supabase is optional coordination layer.

**Design Response:** Write JSON first (required). Supabase sync is optional/async—if Supabase down/unavailable, JSON update succeeds and CEP Panel continues working.

### **C5: LucidLink Storage Latency**
File writes to LucidLink may have 500ms-1s latency. Solution: Don't wait for confirmation, show optimistic UI update.

**Design Response:** Write JSON async, show "⏳ Syncing..." for 1s, then confirm. If write fails, user sees warning on next reload.

---

## **CRITICAL ASSUMPTIONS**

### **A1: JSON File Always Exists** (90% confidence)
Assumption: IA creates `.ingest-metadata.json` before CEP Panel loads clips.

**Risk:** HIGH - If JSON missing, CEP Panel shows empty metadata
**Validation:** B0 - IA integration test (import files → verify JSON exists)
**Mitigation:** CEP Panel creates empty JSON if missing (seeded with PP metadata)

### **A2: Filename Stability** (95% confidence)
Assumption: Original filename (EA001621) never changes after initial import.

**Risk:** MEDIUM - If user renames file, metadata lookup breaks
**Validation:** B1 - User education (rename in PP only, never rename file)
**Mitigation:** CEP Panel stores both old+new names in JSON during PP Clip Name updates

### **A3: Lock Enforcement Reduces IA Conflicts** (80% confidence)
Assumption: QC person locks metadata → IA respects lock and skips field.

**Risk:** MEDIUM - Duplicate entries if IA ignores lock
**Validation:** B2 - Test IA + CEP conflict scenarios (CEP locks, IA attempts write)
**Mitigation:** Add audit log to JSON showing all attempted writes (locked or not)

### **A4: IndexedDB Sync Doesn't Corrupt JSON** (85% confidence)
Assumption: Offline edits + online sync don't create data corruption.

**Risk:** MEDIUM - Race condition if user edits offline AND online simultaneously
**Validation:** B2 - Simulate offline scenario (disconnect, edit 5 clips, reconnect, verify sync)
**Mitigation:** Timestamp-based conflict detection, show warning if concurrent edits detected

---

## **SUCCESS CRITERIA (Measurable, Testable)**

**SC1: Metadata Round-Trip**
- User edits 5 fields → Clicks Apply → Reopens clip → All 5 fields reload identically
- Measured: Byte-for-byte JSON comparison before/after reload

**SC2: Offline Functionality**
- User disconnects network → Opens 5 clips → Edits all → Reconnects → All synced within 5 seconds
- Measured: IndexedDB content matches JSON file after sync

**SC3: IA Integration**
- IA writes metadata → CEP loads same clip → All IA-generated fields hydrate
- Measured: JSON keys present in CEP form without errors

**SC4: Performance**
- CEP Panel update cycle: <500ms (read JSON, update, write back)
- Measured: Browser DevTools performance timeline

**SC5: Lock Enforcement**
- CEP locks field → IA attempts write → IA skips field, logs as skipped
- Measured: Audit log shows "skipped due to lock"

**SC6: Archive Durability**
- Files migrated from LucidLink → Ubuntu → Archive → JSON still readable/writable
- Measured: CEP Panel can read/update metadata after storage migration

---

## **INTEGRATION POINTS**

### **With Ingest Assistant**
- **Input:** Raw/proxy files from IA's initial file transfer
- **Output:** `.ingest-metadata.json` with schema 2.0 format
- **Sync:** CEP Panel reads IA's JSON, respects lock array
- **Conflict:** IA skips fields in `lockedFields` array

### **With Premiere Pro**
- **Input:** PP Tape Name (immutable ID), PP Clip Name (user-visible name)
- **Output:** Updated PP columns + PP Clip Name (shotName format)
- **Sync:** CEP writes → PP columns updated, survives offline
- **No Back-Sync:** PP→CEP (PP is derived, not source of truth)

### **With Supabase (OPTIONAL)**
- **Status:** Optional integration—CEP Panel works with or without Supabase
- **Purpose:** Coordination during active projects (dashboards, reporting, real-time sync)
- **Input:** Initial metadata during active project (if available)
- **Output:** Metadata updates (async, best-effort, non-blocking)
- **Fallback:** If Supabase unavailable: CEP Panel continues working with JSON only
- **Durability:** JSON is source of truth, not Supabase (can lose Supabase data without data loss)

### **With cam-op-pwa**
- **Input:** Shot definitions from cam-op (shootSeq, shotSeq via Supabase)
- **Output:** CEP stores shotNumber for round-trip matching
- **Sync:** Both read same `shots` table from Supabase (during active project)
- **Archive:** After project ends, Supabase data deleted, but JSON metadata persists

---

## **TIMELINE & MILESTONES**

**Phase 0 (Immediate - 1 day):**
- Lock JSON schema (R1)
- Create fixture `.ingest-metadata.json` files for testing
- Both CEP + IA teams agree on format

**Phase 1 (Parallel - 3-4 days each):**
- **Track A (CEP Panel):** JSON read, hydrate form, write back (TDD: fixtures first)
- **Track B (IA):** JSON export from initial file transfer (TDD: fixtures first)

**Phase 2 (Integration - 1 day):**
- Mount CEP Panel + IA against same folder structure
- Cross-validate JSON format + round-trip

**Phase 3 (Offline + Sync - 2-3 days):**
- IndexedDB caching
- Offline sync queue
- Performance optimization

---

## **RISK ASSESSMENT**

**Risk 1: JSON File Missing** (HIGH)
- **Probability:** 20% (IA may not output JSON in initial release)
- **Impact:** CEP Panel shows empty metadata, QC blocked
- **Mitigation:** CEP creates empty JSON if missing, seed with PP values

**Risk 2: Filename Conflicts** (MEDIUM)
- **Probability:** 15% (user renames file in PP or file manager)
- **Impact:** Metadata lookup fails, data orphaned
- **Mitigation:** Store all known filenames in JSON `aliases` field

**Risk 3: Lock Conflict Escalation** (MEDIUM)
- **Probability:** 25% (IA doesn't respect lock, overwrites)
- **Impact:** QC corrections lost to IA re-runs
- **Mitigation:** Audit log tracks all writes, show warning if lock violated

**Risk 4: Storage Migration Data Loss** (LOW)
- **Probability:** 5% (file corruption during LucidLink→Archive)
- **Impact:** Metadata unreadable after migration
- **Mitigation:** Validate JSON on every read, checksum verification

---

## **DECISION GATES**

### **D0: Schema Lock (REQUIRED)**
Requirements-steward + technical-architect approve JSON schema (R1).
- ✓ All fields defined with types
- ✓ Lock mechanism documented
- ✓ Both IA + CEP agree on format
- ✓ Fixture files created

**Target:** 1 day (TODAY if proceeding)

### **B0: Integration Design**
Technical-architect validates:
- ✓ CEP Panel JSON read path feasible
- ✓ IA JSON export feasible
- ✓ File I/O via ExtendScript works for atomic writes
- ✓ Offline sync strategy sound

**Target:** 1 day (parallel with Phase 0)

### **B1: Foundation Test**
CEP Panel reads fixture JSON, hydrates form, writes back.
- ✓ Round-trip test passing
- ✓ File atomicity validated
- ✓ Offline cache (IndexedDB) working

**Target:** 3-4 days (Phase 1 complete)

### **B2: Integration Test**
CEP Panel + IA JSON merge passing.
- ✓ IA output matches CEP expectations
- ✓ Lock enforcement tested
- ✓ Conflict scenarios exercised

**Target:** 1 day (Phase 2)

---

## **PHASE SEQUENCE**

```
D1: NORTH STAR ✅ (THIS DOCUMENT)
     ↓
D2: DESIGN (JSON schema finalized, data flow diagrams)
     ↓
D3: BLUEPRINT (CEP Panel architecture + IA export spec)
     ↓
B0: VALIDATION (Integration feasibility checked)
     ↓
B1: BUILD PLAN (Task decomposition, dependency mapping)
     ↓
B2: TDD RED→GREEN (Tests first, then implementation)
     ↓
B3: INTEGRATION (CEP + IA alignment testing)
     ↓
B4: HANDOFF (Production deployment + editor training)
```

---

## **NEXT STEP (IMMEDIATE)**

**Orchestrate D2 (Design) phase:**

1. **Technical-architect:** Finalize JSON schema (R1), validate file I/O strategy
2. **Requirements-steward:** Confirm North Star alignment with universal immutables
3. **Implementation-lead:** Create fixture files, begin Phase 1 task breakdown

**Entry Criteria:**
- ✓ This North Star approved
- ✓ Schema locked (no further changes to R1)
- ✓ Parallel Phase 1 work can begin immediately

**Exit Criteria (B0 validation gate):**
- ✓ JSON schema documented with examples
- ✓ CEP Panel technical design complete
- ✓ IA export technical design complete
- ✓ Both teams agree on integration point

---

**STATUS:** 🟢 READY FOR IMPLEMENTATION
**APPROVED BY:** Holistic Orchestrator (2025-11-18)
**BINDING AUTHORITY:** This North Star is immutable. Changes require human judgment (requirements-steward escalation).
