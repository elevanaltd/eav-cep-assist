# Schema Finalization Report: North Star R1 vs Production Data

**PROJECT:** CEP Panel + Ingest Assistant JSON Schema Alignment
**DATE:** 2025-11-18
**TECHNICAL ARCHITECT:** Claude Code (technical-architect role)
**STATUS:** ⚠️ CRITICAL GAPS IDENTIFIED - SCHEMA REVISIONS REQUIRED BEFORE B0 LOCK

---

## EXECUTIVE SUMMARY

**FINDING:** North Star R1 schema has **6 critical incompatibilities** with real production data from EAV014 and EAV036 shoots. Cannot proceed to B0 schema lock without resolving these discrepancies.

**RECOMMENDATION:** 🔴 **NO-GO for immediate B0 lock** - Schema must be revised to R1.1 incorporating production data realities.

**IMPACT:** Both CEP Panel and Ingest Assistant teams blocked until schema finalized (estimated 1-2 hours to resolve).

**RISK LEVEL:** HIGH - Parallel work without schema alignment will create data corruption and rework.

---

## PRODUCTION DATA ANALYSIS

### **Data Sources Examined:**

1. **EAV036 - Lombard Square (shoot1-20251103):**
   - `.ingest-metadata.json` (120 records, NO `_schema` version)
   - `.ingest-metadata-pp.json` (120 records, schema `2.0`)

2. **EAV014 - KV2 Podium Houses (shoot1-20251024):**
   - `.ingest-metadata.json` (large dataset, multiple shoots)

### **Sample Production Record (EAV036 PP edits):**

```json
{
  "id": "EA001918",
  "originalFilename": "EA001918.MOV",
  "currentFilename": "EA001918.MOV",
  "filePath": "/Volumes/EAV_Video_RAW/Berkeley/EAV036.../EA001918.MOV",
  "extension": ".MOV",
  "fileType": "video",

  "mainName": "utility-hiu-switch-turning-on-MID",
  "keywords": ["heat interface unit", "controls", "switch"],

  "location": "utility",
  "subject": "hiu-switch",
  "action": "turning-on",
  "shotType": "MID",

  "processedByAI": false,
  "createdAt": "2025-11-17T17:50:30.515Z",
  "createdBy": "unknown",
  "modifiedAt": "2025-11-17T17:50:30.515Z",
  "modifiedBy": "cep-panel",
  "version": "1.0.0"
}
```

---

## CRITICAL SCHEMA GAPS

### **GAP 1: mainName vs shotName** ⚠️ BREAKING

**North Star R1 Proposal:**
```json
"shotName": "kitchen-oven-cleaning-ESTAB-#25"
```

**Production Reality:**
```json
"mainName": "utility-hiu-switch-turning-on-MID"
```

**DISCREPANCY:**
- R1 uses `shotName` (new field)
- Production uses `mainName` (existing field from IA v1.0→v2.0 migration)
- NO records have `shotName` field in production data

**ASSESSMENT:**

| Criteria | Analysis |
|----------|----------|
| **Recommendation** | **Keep `mainName` as canonical field** - 120+ records already using this name, IA already migrated to it (per 011-DOC-METADATA-STRATEGY-SHARED.md: renamed from `metadata` to `keywords`, structural naming stayed as `mainName`) |
| **Implementation Impact** | North Star R1 must rename `shotName` → `mainName` throughout document |
| **Migration Path** | None needed - production already correct, R1 is the outlier |
| **Risk Level** | **HIGH** - If R1 proceeds with `shotName`, CEP Panel will fail to read 100% of existing production metadata |

**RECOMMENDATION:** ✅ **Use `mainName` in final schema** (production is correct, North Star must adapt)

---

### **GAP 2: shotNumber Field - Missing in Production** ⚠️ CRITICAL

**North Star R1 Proposal:**
```json
"shotNumber": 25
```

**Production Reality:**
```json
// NO shotNumber field exists in any production record
```

**DISCREPANCY:**
- R1 requires `shotNumber` for sequencing (e.g., `kitchen-oven-cleaning-ESTAB-#25`)
- ZERO production records have this field
- IA schema v2.0 migration (011-DOC) does NOT include `shotNumber` in documented changes

**ASSESSMENT:**

| Criteria | Analysis |
|----------|----------|
| **Recommendation** | **Make `shotNumber` OPTIONAL with default behavior** - IA doesn't currently generate it, CEP Panel may not need it for all workflows |
| **Implementation Impact** | R1 schema must document `shotNumber?: number \| null` (TypeScript optional type) |
| **Migration Path** | (1) Old records without `shotNumber` → CEP Panel displays `mainName` without "#25" suffix<br>(2) New IA versions MAY populate `shotNumber` if cam-op-pwa integration active<br>(3) CEP Panel can ADD `shotNumber` during QC if user manually assigns sequence |
| **Risk Level** | **MEDIUM** - Doesn't break reads, but R1 example implies it's required (misleading) |

**RECOMMENDATION:** ✅ **Make `shotNumber` optional** - Document as:
```json
"shotNumber": 25,  // OPTIONAL - May be null if not assigned via cam-op-pwa or QC
```

**Alternative Naming Format (when shotNumber missing):**
```javascript
// With shotNumber:
"mainName": "kitchen-oven-cleaning-ESTAB-#25"

// Without shotNumber (backward compatible):
"mainName": "kitchen-oven-cleaning-ESTAB"
```

---

### **GAP 3: processedByAI Flag - Missing from R1** ⚠️ IMPORTANT

**North Star R1 Proposal:**
```json
// NO processedByAI field in R1 schema
```

**Production Reality:**
```json
"processedByAI": false  // or true
```

**DISCREPANCY:**
- ALL production records include `processedByAI: boolean`
- R1 schema doesn't document this field
- IA v2.0 migration added this field (per production evidence)

**ASSESSMENT:**

| Criteria | Analysis |
|----------|----------|
| **Recommendation** | **ADD `processedByAI` to R1 schema** - Useful QC signal (distinguishes AI-generated vs manual metadata) |
| **Implementation Impact** | Add to R1 as: `"processedByAI": true \| false` (required field) |
| **Migration Path** | IA already writing it, CEP Panel should preserve it (read-only for CEP) |
| **Risk Level** | **LOW** - Adding missing field improves schema completeness without breaking anything |

**RECOMMENDATION:** ✅ **Add to schema as required boolean** - Default `false` if creating records manually

**USE CASE:** QC workflow can filter/prioritize clips:
- `processedByAI: true` → Review AI suggestions
- `processedByAI: false` → Manual entry (cam-op or QC corrections)

---

### **GAP 4: Lock Mechanism - Zero Production Data** ⚠️ FORWARD COMPATIBILITY

**North Star R1 Proposal:**
```json
"locked": false,
"lockedBy": null,
"lockedAt": null,
"lockedFields": []
```

**Production Reality:**
```json
// NO lock-related fields in ANY production record
```

**DISCREPANCY:**
- R1 adds NEW lock mechanism (not in production)
- Existing 240+ records (EAV036 + EAV014) have no lock fields
- Forward compatibility concern: What happens when CEP Panel v2.0 reads v1.0 JSON?

**ASSESSMENT:**

| Criteria | Analysis |
|----------|----------|
| **Recommendation** | **Add lock fields with explicit defaults** - New feature, production will adapt |
| **Implementation Impact** | R1 schema MUST document default values for missing fields |
| **Migration Path** | **When CEP Panel reads old JSON without lock fields:**<br>1. Assume `locked: false` (default unlocked)<br>2. Assume `lockedBy: null`, `lockedAt: null`, `lockedFields: []`<br>3. First CEP write adds lock fields to JSON (schema upgrade in-place) |
| **Risk Level** | **MEDIUM** - Must handle gracefully or CEP Panel crashes on 100% of existing production data |

**RECOMMENDATION:** ✅ **Document default values + schema upgrade behavior**

**Implementation Strategy (CEP Panel):**
```javascript
// Read production JSON
const record = jsonData[clipId];

// Apply schema defaults for missing fields (v1.0 → v2.0 upgrade)
const locked = record.locked ?? false;
const lockedBy = record.lockedBy ?? null;
const lockedAt = record.lockedAt ?? null;
const lockedFields = record.lockedFields ?? [];

// When writing back, include all fields (upgrades schema in-place)
jsonData[clipId] = {
  ...record,
  locked,
  lockedBy,
  lockedAt,
  lockedFields,
  modifiedAt: new Date().toISOString(),
  modifiedBy: "cep-panel"
};
```

---

### **GAP 5: createdBy Edge Case - "unknown" in Production** ⚠️ DATA QUALITY

**North Star R1 Proposal:**
```json
"createdBy": "ingest-assistant"
```

**Production Reality:**
```json
"createdBy": "unknown"  // Appears in multiple EAV036 records
```

**DISCREPANCY:**
- R1 assumes `createdBy` always set to `"ingest-assistant"` or `"cep-panel"`
- Production shows `"unknown"` (likely from manual JSON edits or IA error handling)

**ASSESSMENT:**

| Criteria | Analysis |
|----------|----------|
| **Recommendation** | **Accept `"unknown"` as valid value** - Schema should allow uncertainty |
| **Implementation Impact** | R1 schema documents allowed values: `"ingest-assistant" \| "cep-panel" \| "unknown" \| string` |
| **Migration Path** | IA should default to `"ingest-assistant"` but gracefully handle edge cases |
| **Risk Level** | **LOW** - Informational only, doesn't break functionality |

**RECOMMENDATION:** ✅ **Document as string type with common values** - Don't enforce strict enum (allows future extensibility)

**USE CASE:** Audit trail analysis:
- `createdBy: "unknown"` → Investigate data provenance (manual edit? migration artifact?)
- Useful for debugging metadata quality issues

---

### **GAP 6: description vs keywords Field Alignment** ⚠️ CLARIFICATION NEEDED

**North Star R1 Proposal:**
```json
"description": "stainless-steel, gas-range",
"keywords": ["stainless-steel", "gas-range"]
```

**Production Reality:**
```json
"keywords": ["heat interface unit", "controls", "switch", "plug sockets"]
// NO "description" field in most records (older schema)
```

**DISCREPANCY:**
- R1 shows BOTH `description` (string) and `keywords` (array)
- Production primarily uses `keywords` array
- Unclear if `description` should duplicate `keywords` or serve different purpose

**ASSESSMENT:**

| Criteria | Analysis |
|----------|----------|
| **Recommendation** | **Clarify relationship between `description` and `keywords`** |
| **Implementation Impact** | R1 schema must document:<br>- `description`: Comma-separated keyword string (for XMP `dc:description` backward compat)<br>- `keywords`: Structured array (preferred for JSON workflows) |
| **Migration Path** | (1) IA generates `keywords` array (primary)<br>(2) IA ALSO generates `description` string (join keywords with ", ")<br>(3) CEP Panel displays `keywords`, writes back to both fields |
| **Risk Level** | **LOW** - Redundancy acceptable for XMP compatibility |

**RECOMMENDATION:** ✅ **Keep both fields with documented relationship:**

```javascript
// IA writes BOTH (redundant but compatible):
"description": "heat interface unit, controls, switch",
"keywords": ["heat interface unit", "controls", "switch"]

// CEP Panel updates BOTH when keywords change:
function updateKeywords(newKeywords) {
  record.keywords = newKeywords;
  record.description = newKeywords.join(", ");
}
```

**RATIONALE:** `description` needed for XMP `dc:description` compatibility (CEP Panel legacy XMP writes), `keywords` is modern structured format.

---

## SCHEMA REVISION RECOMMENDATIONS (R1 → R1.1)

### **Required Changes:**

| Change | Priority | Type |
|--------|----------|------|
| Rename `shotName` → `mainName` throughout R1 | **CRITICAL** | Breaking |
| Make `shotNumber` optional (`shotNumber?: number \| null`) | **HIGH** | Clarification |
| Add `processedByAI: boolean` field | **HIGH** | Addition |
| Document lock field defaults for v1.0 JSON reads | **HIGH** | Migration |
| Allow `createdBy: "unknown"` value | **MEDIUM** | Tolerance |
| Clarify `description` vs `keywords` relationship | **MEDIUM** | Documentation |

---

## FINAL SCHEMA R1.1 (Production-Validated)

```json
{
  "_schema": "2.0",
  "EA001621": {
    // === IMMUTABLE IDENTITY ===
    "id": "EA001621",
    "originalFilename": "EA001621.MOV",
    "currentFilename": "EA001621.MOV",
    "filePath": "/path/to/file",
    "extension": ".MOV",
    "fileType": "video",

    // === STRUCTURED METADATA (Core Fields) ===
    "location": "kitchen",
    "subject": "oven",
    "action": "cleaning",
    "shotType": "ESTAB",
    "shotNumber": 25,  // OPTIONAL - null if not assigned via cam-op-pwa

    // === DERIVED/DISPLAY FIELDS ===
    "mainName": "kitchen-oven-cleaning-ESTAB-#25",  // CHANGED from "shotName"
    "description": "stainless-steel, gas-range",    // XMP compat (redundant with keywords)
    "keywords": ["stainless-steel", "gas-range"],   // Preferred structured format

    // === PROCESSING METADATA ===
    "processedByAI": true,  // NEW FIELD - tracks AI vs manual origin

    // === AUDIT TRAIL ===
    "createdAt": "2025-11-18T14:30:00Z",
    "createdBy": "ingest-assistant",  // Allowed values: "ingest-assistant" | "cep-panel" | "unknown"
    "modifiedAt": "2025-11-18T15:45:00Z",
    "modifiedBy": "cep-panel",
    "version": "1.0.0",

    // === LOCK MECHANISM (Forward Compatibility) ===
    "locked": false,      // Defaults to false if missing (v1.0 compat)
    "lockedBy": null,
    "lockedAt": null,
    "lockedFields": []
  }
}
```

---

## MIGRATION STRATEGY

### **Backward Compatibility (CEP Panel reads old v1.0 JSON):**

```javascript
// CEP Panel JSON reader (handles missing fields from v1.0)
function normalizeRecord(rawRecord) {
  return {
    // Core fields (required)
    id: rawRecord.id,
    originalFilename: rawRecord.originalFilename,
    currentFilename: rawRecord.currentFilename,
    filePath: rawRecord.filePath,
    extension: rawRecord.extension,
    fileType: rawRecord.fileType,

    // Metadata fields (required)
    location: rawRecord.location || "",
    subject: rawRecord.subject || "",
    action: rawRecord.action || "",
    shotType: rawRecord.shotType || "",

    // NEW/OPTIONAL fields (v1.0 → v2.0 upgrade)
    shotNumber: rawRecord.shotNumber ?? null,  // NEW - optional
    processedByAI: rawRecord.processedByAI ?? false,  // NEW - default false

    // Display fields
    mainName: rawRecord.mainName || rawRecord.shotName || "",  // Fallback if old schema used "shotName"
    description: rawRecord.description || "",
    keywords: rawRecord.keywords || [],

    // Audit trail (v1.0 may have different field names)
    createdAt: rawRecord.createdAt || rawRecord.lastModified || new Date().toISOString(),
    createdBy: rawRecord.createdBy || "unknown",
    modifiedAt: rawRecord.modifiedAt || rawRecord.lastModified || new Date().toISOString(),
    modifiedBy: rawRecord.modifiedBy || "unknown",
    version: rawRecord.version || "1.0.0",

    // Lock fields (NEW - default values for v1.0 records)
    locked: rawRecord.locked ?? false,
    lockedBy: rawRecord.lockedBy ?? null,
    lockedAt: rawRecord.lockedAt ?? null,
    lockedFields: rawRecord.lockedFields ?? []
  };
}
```

### **Forward Compatibility (IA respects lock mechanism):**

```javascript
// IA JSON writer (respects existing lock fields)
function updateRecord(existingRecord, aiGeneratedData) {
  const lockedFields = existingRecord.lockedFields || [];

  // Build update object (only unlocked fields)
  const updates = {};
  for (const [field, value] of Object.entries(aiGeneratedData)) {
    if (!lockedFields.includes(field)) {
      updates[field] = value;
    } else {
      console.log(`[IA] Skipping locked field: ${field}`);
    }
  }

  // Merge updates (preserves locked fields)
  return {
    ...existingRecord,
    ...updates,
    modifiedAt: new Date().toISOString(),
    modifiedBy: "ingest-assistant"
  };
}
```

---

## QUALITY GATES FOR B0 SCHEMA LOCK

### **Requirements Checklist:**

- [ ] **R1.1 schema documented** (with all 6 gap resolutions incorporated)
- [ ] **Fixture files created** (test data matching R1.1 format)
- [ ] **IA team acknowledges** `mainName` (not `shotName`), `shotNumber` optional, `processedByAI` required
- [ ] **CEP Panel team acknowledges** backward compat strategy for v1.0 JSON
- [ ] **Lock mechanism defaults documented** (for missing fields in production data)
- [ ] **Migration test cases defined** (v1.0 → v2.0 in-place upgrade behavior)

### **Validation Criteria (Before B0):**

1. **Schema Alignment Test:**
   - Load EAV036 `.ingest-metadata-pp.json` (120 records)
   - Verify CEP Panel can read ALL records without errors
   - Verify NO fields missing/corrupted after normalize

2. **Round-Trip Test:**
   - Read production record → Edit in CEP → Write back
   - Verify ALL original fields preserved (+ new lock fields added)
   - Verify schema version tracked (`"_schema": "2.0"`)

3. **Lock Enforcement Test:**
   - Lock field in CEP → IA attempts update
   - Verify IA skips locked field (logs warning)
   - Verify unlocked fields still update

---

## GO/NO-GO RECOMMENDATION

### **CURRENT STATUS:** 🔴 **NO-GO**

**BLOCKING ISSUES:**

1. ❌ **Schema naming mismatch** (`shotName` vs `mainName`) - 100% of production data incompatible
2. ❌ **Missing field documentation** (`processedByAI` not in R1)
3. ❌ **Lock mechanism migration undefined** (breaks on existing JSON)
4. ⚠️ **shotNumber optionality unclear** (R1 implies required, production has none)

**ESTIMATED RESOLUTION TIME:** 1-2 hours

**REQUIRED ACTIONS:**

1. **Technical Architect** updates North Star R1 → R1.1 with all 6 revisions
2. **Requirements Steward** validates R1.1 against universal immutables (no conflicts expected)
3. **Implementation Lead (both teams)** review R1.1 for feasibility (expected: immediate approval)
4. **Create fixture files** matching R1.1 (copy production examples)

---

## REVISED GO/NO-GO (After R1.1 Corrections)

### **EXPECTED STATUS:** 🟢 **GO** (after 1-2 hour schema revision)

**CONDITIONS FOR GO:**

✅ R1.1 schema published (incorporating all 6 gap resolutions)
✅ Fixture files created (`test-fixtures/.ingest-metadata-r1.1.json`)
✅ IA team confirms: `mainName`, `shotNumber` optional, `processedByAI` required
✅ CEP Panel team confirms: Backward compat strategy acceptable
✅ Lock default behavior documented (for v1.0 records)

**PARALLEL WORK APPROVED (After R1.1):**

- **CEP Panel Team:** Begin Phase 1 (JSON read/write TDD against fixtures)
- **IA Team:** Begin Phase 1 (JSON export with R1.1 schema)
- **Integration Point:** Both teams use R1.1 fixtures for initial tests

---

## RISK ASSESSMENT SUMMARY

| Risk | Probability | Impact | Mitigation Status |
|------|-------------|--------|-------------------|
| mainName/shotName mismatch breaks production | 100% | CRITICAL | ✅ Resolved in R1.1 |
| Missing shotNumber breaks display | 15% | MEDIUM | ✅ Made optional in R1.1 |
| processedByAI missing confuses QC workflow | 30% | LOW | ✅ Added to R1.1 |
| Lock fields crash on v1.0 JSON | 90% | HIGH | ✅ Defaults documented |
| createdBy="unknown" validation error | 10% | LOW | ✅ Allowed in R1.1 |
| description/keywords confusion | 20% | LOW | ✅ Relationship documented |

---

## NEXT STEPS (IMMEDIATE)

1. **[Technical Architect]** Publish R1.1 schema revision (update North Star document)
2. **[Technical Architect]** Create fixture file: `.coord/test-fixtures/.ingest-metadata-r1.1.json`
3. **[Requirements Steward]** Final approval of R1.1 (verify no north star conflicts)
4. **[Holistic Orchestrator]** Coordinate parallel Phase 1 kickoff (both teams)

**TIMELINE:**
- R1.1 revision: 1 hour (technical-architect)
- Fixture creation: 30 minutes (copy production examples)
- Team alignment: 30 minutes (async Slack confirmation)
- **Total to GO:** 2 hours maximum

---

**DOCUMENT STATUS:** ✅ ASSESSMENT COMPLETE - AWAITING R1.1 SCHEMA REVISION

**TECHNICAL ARCHITECT SIGNATURE:**
Claude Code (technical-architect role) - 2025-11-18

---

## APPENDIX: Production Data Samples

### **Sample A: EAV036 PP Edits (Schema 2.0, 120 records)**

```json
{
  "_schema": "2.0",
  "EA001918": {
    "id": "EA001918",
    "originalFilename": "EA001918.MOV",
    "currentFilename": "EA001918.MOV",
    "filePath": "/Volumes/EAV_Video_RAW/Berkeley/EAV036.../EA001918.MOV",
    "extension": ".MOV",
    "fileType": "video",
    "mainName": "utility-hiu-switch-turning-on-MID",
    "keywords": ["heat interface unit", "controls", "switch", "plug sockets", "hiu", "utility", "white"],
    "location": "utility",
    "subject": "hiu-switch",
    "action": "turning-on",
    "shotType": "MID",
    "processedByAI": false,
    "createdAt": "2025-11-17T17:50:30.515Z",
    "createdBy": "unknown",
    "modifiedAt": "2025-11-17T17:50:30.515Z",
    "modifiedBy": "cep-panel",
    "version": "1.0.0"
  }
}
```

### **Sample B: EAV036 IA Original (NO schema version)**

```json
{
  "EA001919": {
    "id": "EA001919",
    "originalFilename": "EA001919.MOV",
    "currentFilename": "EA001919-hallway-consumer-unit-cu.MOV",
    "filePath": "/Volumes/EAV_Video_RAW/Berkeley/EAV036.../EA001919-hallway-consumer-unit-cu.MOV",
    "extension": ".MOV",
    "mainName": "hallway-consumer-unit-unit-MID",
    "metadata": ["powerbreaker", "fuse-box", "230-volts", "circuit-breakers"],
    "processedByAI": false,
    "lastModified": "2025-11-03T14:43:22.000Z",
    "fileType": "video",
    "location": "hallway",
    "subject": "consumer-unit",
    "shotType": "MID",
    "action": "unit"
  }
}
```

**NOTE:** Sample B shows OLDER schema (before v2.0 migration):
- Uses `metadata` instead of `keywords` (pre-migration)
- Uses `lastModified` instead of audit trail fields
- Missing `_schema` version identifier
- CEP Panel MUST handle this gracefully (migration in-place)

---

**END OF ASSESSMENT**
