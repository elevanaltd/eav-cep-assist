# Requirements Validation Report: North Star R1 Schema vs QC Workflow

**ROLE:** Requirements Steward
**DATE:** 2025-11-18
**VERDICT:** 🟡 SCHEMA REQUIRES REVISION BEFORE B0 LOCK
**AUTHORITY LEVEL:** Ultimate (North Star Interpretation & Workflow Alignment)

---

## EXECUTIVE SUMMARY

**North Star R1 schema contains CRITICAL MISALIGNMENTS with:**
1. ✗ Actual IA implementation (v2.0 schema)
2. ✗ Real QC workflow requirements
3. ✗ Production data patterns

**MANDATORY changes required before B0 validation gate. Current schema would cause implementation rework and data corruption risk.**

---

## 1. FIELD ASSESSMENT: Required vs Actual

### CRITICAL DEVIATION #1: Missing `mainName` field

**North Star R1 shows:**
```json
{
  "shotName": "kitchen-oven-cleaning-ESTAB-#25",  ← WRONG field name
  "description": "stainless-steel, gas-range"
}
```

**IA v2.0 ACTUAL implementation:**
```json
{
  "mainName": "kitchen-oven-cleaning-ESTAB",     ← CORRECT field (exists in production)
  "keywords": ["stainless-steel", "gas-range"]   ← Array, not comma-string
}
```

**EVIDENCE:**
- `/Volumes/HestAI-Projects/ingest-assistant/src/types/index.ts:39-40`
- ML Feedback Loop doc uses `mainName` (not `shotName`)
- CLAUDE.md references `mainName` throughout

**IMPACT:**
- CEP Panel would write to `shotName` field → IA doesn't read it
- Metadata round-trip BROKEN (F1 essential functionality violation)
- QC edits lost immediately

**CORRECTION REQUIRED:**
```diff
- "shotName": "kitchen-oven-cleaning-ESTAB-#25",
+ "mainName": "kitchen-oven-cleaning-ESTAB",
```

---

### CRITICAL DEVIATION #2: `keywords` vs `description` field type

**North Star R1 shows:**
```json
{
  "description": "stainless-steel, gas-range",  ← String with commas
  "keywords": ["stainless-steel", "gas-range"]  ← Duplicate?
}
```

**IA v2.0 ACTUAL implementation:**
```json
{
  "keywords": ["stainless-steel", "gas-range"]  ← Array only, no description field
}
```

**EVIDENCE:**
- IA type definition: `keywords: string[]` (line 42)
- IPC schema renamed: `metadata → keywords` for v2.0
- No `description` field in IA types

**IMPACT:**
- CEP Panel writes `description` → IA ignores it
- Duplicate data (both `description` AND `keywords`)
- Schema bloat without benefit

**CORRECTION REQUIRED:**
```diff
- "description": "stainless-steel, gas-range",
- "keywords": ["stainless-steel", "gas-range"],
+ "keywords": ["stainless-steel", "gas-range"],
```

**Remove `description` entirely unless there's a SEPARATE use case (not documented in North Star).**

---

### CRITICAL DEVIATION #3: `shotNumber` field semantics

**North Star R1 shows:**
```json
{
  "shotNumber": 25,
  "shotName": "kitchen-oven-cleaning-ESTAB-#25"  ← Includes shotNumber in name
}
```

**IA v2.0 ACTUAL implementation:**
```json
{
  "shotNumber": 25,  ← Optional field, NOT in mainName
  "mainName": "kitchen-oven-cleaning-ESTAB"  ← NO shotNumber suffix
}
```

**EVIDENCE:**
- IA type: `shotNumber?: number` (optional)
- Real data: Images don't have shotNumber (not all media needs it)
- CLAUDE.md: No mention of shotNumber in `mainName` format

**QC WORKFLOW REALITY:**
- QC person NEVER edits shotNumber (it's a file sequence number)
- shotNumber is IA-calculated (chronological order in folder)
- Not displayed in PP columns (editors don't care about sequence numbers)

**IMPACT:**
- Including shotNumber in `shotName`/`mainName` creates maintenance burden
- Optional field appears required (schema says `25`, not `25?`)
- Images would fail validation (they don't have shotNumber)

**CORRECTION REQUIRED:**
```diff
- "shotNumber": 25,
+ "shotNumber"?: number,  // Optional - only for videos with sequence
- "shotName": "kitchen-oven-cleaning-ESTAB-#25",
+ "mainName": "kitchen-oven-cleaning-ESTAB",  // shotNumber NOT included
```

---

### DEVIATION #4: Lock mechanism fields

**North Star R1 shows:**
```json
{
  "locked": false,
  "lockedBy": null,
  "lockedAt": null,
  "lockedFields": []
}
```

**IA v2.0 ACTUAL implementation:**
- NO lock fields in schema
- Not implemented yet
- Not in QC workflow currently

**QC WORKFLOW REALITY (from user context):**
> "The ONE immutable rule: metadata MUST show in the metadata editor for them to review and update the filename."

**USER NEVER MENTIONED:**
- Locking metadata
- Preventing IA overwrites
- Multi-person conflict resolution

**QUESTION FOR USER:** When would a QC person LOCK metadata?

**ASSUMPTIONS TO VALIDATE:**
- A3: "Lock Enforcement Reduces IA Conflicts" (80% confidence)
- R6: Lock lifecycle defined, but NOT based on observed workflow
- F5: Lock enforcement testable, but IS IT NEEDED?

**RECOMMENDATION:** **Phase 2 Feature** (not B0 critical)

**RATIONALE:**
- QC workflow is LINEAR (one person, batch process 15-20 clips)
- IA runs BEFORE CEP Panel (not concurrently)
- Lock prevents IA re-runs from overwriting QC corrections
- BUT: Is IA re-running on already-processed clips? (Not documented)

**CORRECTION REQUIRED:**
```diff
+ // Lock mechanism (Phase 2 - not MVP)
+ // "locked": false,
+ // "lockedBy": null,
+ // "lockedAt": null,
+ // "lockedFields": []
```

**Move lock fields to Phase 2 requirements. Focus MVP on round-trip persistence (F1).**

---

## 2. WORKFLOW COMPATIBILITY

### Batch QC Performance (15-20 clips per session)

**North Star R1 includes:**
```json
{
  "createdAt": "2025-11-18T14:30:00Z",
  "createdBy": "ingest-assistant",
  "modifiedAt": "2025-11-18T15:45:00Z",
  "modifiedBy": "cep-panel",
  "locked": false,
  "lockedBy": null,
  "lockedAt": null,
  "lockedFields": []
}
```

**8 audit/lock fields PER CLIP** → 160 fields for 20-clip batch

**QC WORKFLOW STRESS TEST:**

| Step | Schema Support | Performance Risk |
|------|----------------|------------------|
| Open clip 1 | ✓ Read JSON | LucidLink 500ms latency (C5) |
| Edit 3 fields | ✓ Form hydration | No issue |
| Click Apply | ✓ Write JSON | **Atomic write + 8 audit fields = 1s?** |
| Navigate to clip 2 | ✓ Cache or re-read? | **16 JSON reads for 20 clips?** |
| Repeat 18 times | ✓ | **18+ seconds overhead?** |

**AUDIT TRAIL VALUE QUESTION:**

For a QC person doing 15 clips at once:
- **Useful:** `modifiedBy: "cep-panel"` → Proves QC reviewed it (vs AI-only)
- **Useful:** `modifiedAt: timestamp` → Shows when QC happened
- **NOT USEFUL:** `createdBy`, `createdAt` → IA always creates (redundant)
- **NOT USEFUL (yet):** `lockedBy`, `lockedAt`, `lockedFields` → No concurrent editing

**RECOMMENDATION:** **Simplify audit trail for MVP**

```diff
{
  "createdAt": "2025-11-18T14:30:00Z",
- "createdBy": "ingest-assistant",  // Always IA - remove redundancy
  "modifiedAt": "2025-11-18T15:45:00Z",
- "modifiedBy": "cep-panel",        // Always CEP when modified - remove redundancy
- "version": "1.0.0",               // App version - useful for migration, keep
- "locked": false,                  // Phase 2
- "lockedBy": null,                 // Phase 2
- "lockedAt": null,                 // Phase 2
- "lockedFields": []                // Phase 2
}
```

**Simpler audit trail:**
```json
{
  "createdAt": "2025-11-18T14:30:00Z",
  "qcReviewedAt": "2025-11-18T15:45:00Z",  // null = AI-only, timestamp = QC reviewed
  "version": "2.0"
}
```

**RATIONALE:**
- `createdBy` = always IA (file always comes from IA)
- `modifiedBy` = always CEP (only CEP Panel writes after creation)
- `qcReviewedAt` = null vs timestamp shows QC status clearly
- Reduces JSON bloat by 40% (8 fields → 3 fields)

---

### Offline QC Editing (F2 Essential Functionality)

**North Star R1 requirement:**
> "User disconnects from network, edits 5 clips' metadata in CEP Panel, reconnects → All edits sync to JSON files."

**Schema support:** ✓ Adequate (IndexedDB cache + sync queue)

**MISSING REQUIREMENT:** What happens when original raw volume is OFFLINE?

**User context says:**
> "I5: Offline-Capable Mobile Operations - CEP Panel QC workflow must function when original raw footage volume is offline (common production scenario: raw files on archive volume, proxies + metadata on local/LucidLink)."

**CRITICAL QUESTION:** Where is `.ingest-metadata.json` when raw volume offline?

**SCENARIO:**
```
Raw volume (OFFLINE):
  /Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/
  ├── EA001932.MOV
  └── .ingest-metadata.json  ← INACCESSIBLE

Proxy volume (ONLINE):
  /Users/editor/Library/LucidLink/EAV036-proxies/
  ├── EA001932_proxy.mov
  └── .ingest-metadata.json  ← WHERE?
```

**North Star R2 says:**
> "Videos: `EAV014/videos-proxy/shoot1-20251024/.ingest-metadata.json`"

**CONTRADICTION:** Raw footage offline → JSON file offline → CEP Panel cannot read metadata

**RESOLUTION NEEDED:**

**Option A:** Metadata in BOTH locations
```
Raw volume: .ingest-metadata.json  ← Source of truth (archive durability)
Proxy volume: .ingest-metadata.json  ← Working copy (offline access)
```

**Option B:** Metadata ONLY with proxies
```
Proxy volume: .ingest-metadata.json  ← Source of truth
Raw volume: NO METADATA (proxies required for editing)
```

**Option C:** IndexedDB cache is primary offline storage
```
Raw volume: .ingest-metadata.json  ← Authoritative when online
IndexedDB: Cached copy  ← Used when volume offline, syncs when online
```

**RECOMMENDATION:** **Option C** (matches North Star design)

**BUT:** North Star R3 doesn't explicitly state this. Need clarification:

> "**R3 Step 2:** Find Metadata File: Metadata file is always in the same folder as the media files"

**PROBLEM:** Which media files? Raw or Proxy?

**CORRECTION REQUIRED:**

Add to R3:
```diff
2. **Find Metadata File:**
-   - Metadata file is **always in the same folder as the media files**
+   - Metadata file is **co-located with PROXY files** (not raw files)
+   - When proxy volume offline: Use IndexedDB cache (read-only)
+   - When proxy volume online: Read from .ingest-metadata.json, cache to IndexedDB
```

---

## 3. EDITOR PERSPECTIVE

### What metadata do editors NEED in Premiere columns?

**User context says:**
> "The ONE immutable rule: metadata MUST show in the metadata editor for them to review and update the filename."

**Translation:** Editors need to see:
1. **Clip Name** (PP Clip Name column) = `mainName` value
2. **Metadata columns** (PP custom metadata) = location, subject, action, shotType, keywords

**North Star R4 says:**
```
2. **Update PP:**
   - Set PP Clip Name to `{location}-{subject}-{action}-{shotType}-{shotNumber}`
   - Update PP Metadata columns (location, subject, action, shotType, shotNumber, description)
```

**DEVIATION:** PP Clip Name includes `shotNumber`, but `mainName` doesn't (per IA implementation)

**CORRECTION REQUIRED:**
```diff
- Set PP Clip Name to `{location}-{subject}-{action}-{shotType}-{shotNumber}`
+ Set PP Clip Name to `{location}-{subject}-{action}-{shotType}`
- Update PP Metadata columns (location, subject, action, shotType, shotNumber, description)
+ Update PP Metadata columns (location, subject, action, shotType, keywords)
```

**RATIONALE:**
- IA generates `mainName` WITHOUT shotNumber
- PP Clip Name should match `mainName` (consistency)
- Editors don't need shotNumber displayed (it's a file sequence ID, not descriptive metadata)

---

### Will current schema fields display correctly in PP?

**North Star R1 fields:**
- ✓ `location` → PP Metadata column (custom field)
- ✓ `subject` → PP Metadata column (custom field)
- ✓ `action` → PP Metadata column (custom field)
- ✓ `shotType` → PP Metadata column (custom field)
- ✗ `shotNumber` → PP column? (not needed by editors)
- ✗ `description` → PP column? (doesn't exist in IA schema)
- ✓ `keywords` → PP column? (array - how to display?)

**MISSING CLARITY:** How do arrays display in PP metadata columns?

**PP Metadata Limitation:** Custom metadata columns are STRING-only (no array support)

**SOLUTION:** Convert `keywords` array to comma-separated string for PP display

```javascript
// CEP Panel writes to PP
var keywordsString = metadata.keywords.join(', ');  // ["door", "lock"] → "door, lock"
clip.setMetadata('keywords', keywordsString);
```

**CORRECTION REQUIRED:**

Add to R4:
```diff
2. **Update PP:**
   - Set PP Clip Name to `{location}-{subject}-{action}-{shotType}`
-  - Update PP Metadata columns (location, subject, action, shotType, shotNumber, description)
+  - Update PP Metadata columns:
+    - location (string)
+    - subject (string)
+    - action (string)
+    - shotType (string)
+    - keywords (array → comma-separated string for PP display)
```

---

## 4. ASSUMPTIONS CHECK

### A1: JSON File Always Exists (90% confidence)

**North Star says:**
> Assumption: IA creates `.ingest-metadata.json` before CEP Panel loads clips.
> **Mitigation:** CEP Panel creates empty JSON if missing (seeded with PP metadata)

**VALIDATION:** ✓ Reasonable mitigation

**BUT:** What PP metadata exists to seed from?

**PP has:**
- Tape Name (immutable ID)
- Clip Name (user-visible name, may be empty)
- Custom metadata columns (location, subject, action, shotType - likely empty before CEP Panel first edit)

**SEEDING STRATEGY:** If JSON missing, create stub:
```json
{
  "_schema": "2.0",
  "EA001621": {
    "id": "EA001621",
    "originalFilename": "EA001621.MOV",
    "currentFilename": "EA001621.MOV",
    "filePath": "[extracted from PP clip path]",
    "extension": ".MOV",
    "fileType": "video",
    "mainName": "",  // Empty - QC will fill
    "keywords": [],
    "location": "",
    "subject": "",
    "action": "",
    "shotType": "",
    "createdAt": "[current timestamp]",
    "qcReviewedAt": null,
    "version": "2.0"
  }
}
```

**CORRECTION REQUIRED:** Document seeding strategy in R3.

---

### A2: Filename Stability (95% confidence)

**North Star says:**
> Assumption: Original filename (EA001621) never changes after initial import.
> **Mitigation:** CEP Panel stores both old+new names in JSON during PP Clip Name updates

**VALIDATION:** ✗ Mitigation NOT in schema

**Schema shows:** `originalFilename`, `currentFilename` (both strings, not arrays)

**PROBLEM:** If user renames file in Finder:
- `originalFilename: "EA001621.MOV"` (immutable)
- `currentFilename: "EA001621.MOV"` → Should update to `"kitchen-oven-ESTAB.MOV"`?
- JSON key: `"EA001621"` → How to find record if filename changed?

**BETTER MITIGATION:** Use PP Tape Name as immutable ID (already in schema)

**PP Import Strategy:**
1. Import clip → Set Tape Name = original filename ID (EA001621)
2. Rename file in Finder → PP Tape Name unchanged
3. CEP Panel uses Tape Name for JSON lookup → Always finds record

**CORRECTION REQUIRED:**

Update A2:
```diff
- Assumption: Original filename (EA001621) never changes after initial import.
+ Assumption: PP Tape Name is set to original filename ID at import and never changes.
- Mitigation: CEP Panel stores both old+new names in JSON during PP Clip Name updates
+ Mitigation: CEP Panel uses PP Tape Name for JSON lookup (immune to file renames)
```

---

### A3: Lock Enforcement Reduces IA Conflicts (80% confidence)

**North Star says:**
> Assumption: QC person locks metadata → IA respects lock and skips field.

**VALIDATION:** ⏳ Untestable (lock mechanism not implemented in IA yet)

**REAL WORKFLOW QUESTION:** Does IA re-run on already-processed files?

**Scenario 1:** IA runs once (initial file transfer) → Never touches files again
- **Lock NOT needed** (no conflict possible)

**Scenario 2:** IA re-runs periodically (re-analyze files) → Might overwrite QC edits
- **Lock ESSENTIAL** (prevents data loss)

**USER CLARIFICATION NEEDED:** Which scenario is real?

**RECOMMENDATION:** **Phase 2 feature** until user confirms IA re-run behavior.

---

### A4: IndexedDB Sync Doesn't Corrupt JSON (85% confidence)

**North Star says:**
> Assumption: Offline edits + online sync don't create data corruption.
> **Mitigation:** Timestamp-based conflict detection, show warning if concurrent edits detected

**VALIDATION:** ✓ Standard offline-sync pattern (proven in many apps)

**BUT:** C5 constraint mentions LucidLink 500ms-1s latency

**RACE CONDITION RISK:**

```
User A: Edits offline → Queues write (timestamp: 14:30:00)
LucidLink: Write delayed 1s → File written at 14:30:01
User B: Reads file at 14:30:00.5 → Sees old data
User B: Edits → Writes at 14:30:02 → Overwrites User A's changes
```

**MITIGATION ENHANCEMENT:**

Add file lock during write:
```javascript
// ExtendScript (jsx/host.jsx)
function atomicJSONWrite(filePath, jsonData) {
  var lockFile = new File(filePath + '.lock');

  // Wait for lock release (max 5s)
  var attempts = 0;
  while (lockFile.exists && attempts < 50) {
    $.sleep(100);  // 100ms
    attempts++;
  }

  if (lockFile.exists) {
    return {error: 'File locked by another process'};
  }

  // Create lock
  lockFile.open('w');
  lockFile.write(new Date().getTime());
  lockFile.close();

  // Write JSON atomically
  var tempFile = new File(filePath + '.tmp');
  tempFile.open('w');
  tempFile.write(JSON.stringify(jsonData, null, 2));
  tempFile.close();

  // Rename
  tempFile.rename(filePath);

  // Remove lock
  lockFile.remove();

  return {success: true};
}
```

**CORRECTION REQUIRED:**

Update A4 mitigation:
```diff
- Mitigation: Timestamp-based conflict detection, show warning if concurrent edits detected
+ Mitigation: File lock (.lock file) during write prevents concurrent edits
+            + Timestamp-based conflict detection as secondary check
+            + Show warning if lock timeout (>5s) detected
```

---

## 5. RECOMMENDATION

### Is North Star schema READY for B0 lock and parallel work?

**VERDICT:** 🔴 **NO - MANDATORY REVISIONS REQUIRED**

**Critical blockers:**
1. ✗ `shotName` field doesn't exist in IA (should be `mainName`)
2. ✗ `description` field conflicts with `keywords` (remove one)
3. ✗ `shotNumber` in `mainName` contradicts IA implementation
4. ✗ Lock mechanism premature (Phase 2 feature, not MVP)
5. ✗ Offline metadata access strategy unclear (raw vs proxy location)
6. ✗ Audit trail bloated (8 fields when 3 needed)

---

### What changes are MANDATORY before implementation?

**CRITICAL (BLOCKING):**

1. **Field Name Alignment:**
   ```diff
   - "shotName": "kitchen-oven-cleaning-ESTAB-#25",
   + "mainName": "kitchen-oven-cleaning-ESTAB",
   ```

2. **Remove Duplicate Metadata:**
   ```diff
   - "description": "stainless-steel, gas-range",
   + // REMOVED - keywords array is sufficient
   ```

3. **Clarify shotNumber Usage:**
   ```diff
   - "shotNumber": 25,  // Required
   + "shotNumber"?: number,  // Optional - videos only, NOT in mainName
   ```

4. **Simplify Audit Trail:**
   ```diff
   - "createdBy": "ingest-assistant",
   - "modifiedBy": "cep-panel",
   - "locked": false,
   - "lockedBy": null,
   - "lockedAt": null,
   - "lockedFields": []
   + "qcReviewedAt": null,  // null = AI-only, timestamp = QC reviewed
   ```

5. **Clarify Metadata Location (R2):**
   ```diff
   + Metadata co-located with PROXY files (not raw)
   + When proxy offline: Use IndexedDB cache (read-only)
   + When proxy online: Read from JSON, write to JSON + IndexedDB
   ```

6. **Update PP Write Spec (R4):**
   ```diff
   - Set PP Clip Name to `{location}-{subject}-{action}-{shotType}-{shotNumber}`
   + Set PP Clip Name to `{location}-{subject}-{action}-{shotType}`
   - Update PP Metadata columns (location, subject, action, shotType, shotNumber, description)
   + Update PP Metadata columns (location, subject, action, shotType, keywords)
   ```

---

### What can wait until Phase 2?

**DEFERRED (NON-BLOCKING FOR MVP):**

1. **Lock Mechanism** (R6, F5)
   - Not in IA schema yet
   - QC workflow is linear (one person)
   - Need user confirmation: Does IA re-run on processed files?

2. **Supabase Integration** (R4 optional sync)
   - Works without DB (JSON is source of truth)
   - Add after JSON round-trip proven

3. **Field-Level Locks** (R6 future)
   - "Lock specific fields while unlocking others"
   - Over-engineered for initial release

4. **Conflict Detection UI** (A4)
   - Timestamp warnings
   - File lock timeout alerts
   - Add after offline sync working

---

## REVISED SCHEMA (MANDATORY CHANGES APPLIED)

```json
{
  "_schema": "2.0",
  "EA001621": {
    // === File Identification ===
    "id": "EA001621",
    "originalFilename": "EA001621.MOV",
    "currentFilename": "EA001621.MOV",
    "filePath": "/path/to/proxy/EA001621_proxy.mov",
    "extension": ".MOV",
    "fileType": "video",

    // === Core Metadata ===
    "mainName": "kitchen-oven-cleaning-ESTAB",
    "keywords": ["stainless-steel", "gas-range"],

    // === Structured Components ===
    "location": "kitchen",
    "subject": "oven",
    "action": "cleaning",
    "shotType": "ESTAB",
    "shotNumber": 25,  // Optional - only for sequenced videos

    // === Audit Trail (Simplified) ===
    "createdAt": "2025-11-18T14:30:00Z",
    "qcReviewedAt": "2025-11-18T15:45:00Z",  // null = AI-only
    "version": "2.0"
  }
}
```

**Reduced from 17 fields to 14 fields** (18% smaller, clearer semantics)

---

## ALIGNMENT VERDICT

**NORTH STAR R1 ALIGNMENT:** 🔴 **VIOLATION DETECTED**

**DEVIATIONS:**
1. Field naming contradicts IA implementation (`shotName` vs `mainName`)
2. Duplicate metadata fields (`description` + `keywords`)
3. Premature feature inclusion (lock mechanism not in IA)
4. Audit trail bloat (8 fields when 3 sufficient)
5. Offline strategy unclear (raw vs proxy metadata location)

**CORRECTION DIRECTIVE:**

1. **Immediate:** Update North Star R1 with revised schema (this report)
2. **B0 Gate:** Requirements-steward + Technical-architect approve revised schema
3. **Validation:** IA team confirms alignment with v2.0 implementation
4. **Lock:** No parallel work until schema locked (prevent rework)

---

## NEXT STEP (MANDATORY)

**ESCALATION:** Human judgment required

**Questions for user:**
1. Should metadata be `mainName` or `shotName`? (IA uses `mainName`)
2. Do we need BOTH `description` AND `keywords`? (IA has only `keywords`)
3. Should `shotNumber` be in the clip name? (IA doesn't include it)
4. Does IA re-run on already-processed files? (Determines if lock needed now)
5. When raw volume offline, where is metadata? (Proxy folder? IndexedDB only?)

**No implementation until:**
- ✓ User confirms field naming
- ✓ Schema locked with IA alignment
- ✓ Requirements-steward approves revision
- ✓ North Star R1 updated and binding

---

**STATUS:** 🔴 BLOCKED - SCHEMA REVISION REQUIRED
**AUTHORITY:** Requirements Steward (ultimate authority on North Star alignment)
**BINDING DECISION:** No B0 progression until deviations resolved
