# Schema Migration: R1.0 → R1.1

**Migration Date:** 2025-11-18
**Status:** SPECIFICATION COMPLETE (Implementation Pending)
**Impact:** BREAKING CHANGES (Field renames, type changes, new required fields)

---

## 1. EXECUTIVE SUMMARY

### **Why This Migration?**

R1.0 schema was based on **demo/exploratory files** (EAV014, EAV036 production files). User validation confirmed the **actual Ingest Assistant (IA) implementation** uses different field names and types.

**R1.1 Schema = AUTHORITATIVE** (user-validated actual IA implementation)

---

### **Breaking Changes**

| Change Type | R1.0 (Demo) | R1.1 (Authoritative) | Impact |
|-------------|-------------|----------------------|--------|
| **Field Rename** | `mainName` | `shotName` | HIGH - Code changes required |
| **Type Change** | `keywords[]` (array) | `description` (string) | HIGH - JSON structure change |
| **New Field** | (Not present) | `shotNumber` (number) | MEDIUM - IA generates, CEP displays |
| **New Fields** | (Not present) | `locked`, `lockedBy`, `lockedAt` | MEDIUM - Lock enforcement required |

---

## 2. FIELD-BY-FIELD CHANGES

### **2.1 Main Name Field (BREAKING)**

**R1.0 (Demo - INVALID):**
```json
{
  "mainName": "kitchen-oven-cleaning-ESTAB"
}
```

**R1.1 (Authoritative - CORRECT):**
```json
{
  "shotName": "kitchen-oven-cleaning-ESTAB"
}
```

**Impact:**
- CEP Panel code must use `clip.shotName` (NOT `clip.mainName`)
- XMP mapping uses `xmpDM:shotName`
- Form field bindings must update

**Migration Action:**
```javascript
// Migration script
if (clip.mainName && !clip.shotName) {
  clip.shotName = clip.mainName;
  delete clip.mainName;
}
```

---

### **2.2 Keywords/Description Field (BREAKING)**

**R1.0 (Demo - INVALID):**
```json
{
  "keywords": ["stainless-steel", "gas-range", "appliance"]
}
```

**R1.1 (Authoritative - CORRECT):**
```json
{
  "description": "stainless-steel, gas-range, appliance"
}
```

**User Rationale:**
> "description only which IS keywords. It's just more likely to survive offline work than keywords"

**Impact:**
- CEP Panel must handle `description` as STRING (NOT array)
- XMP mapping uses `dc:description` (string)
- Form field shows comma-separated string input

**Migration Action:**
```javascript
// Migration script
if (Array.isArray(clip.keywords) && !clip.description) {
  clip.description = clip.keywords.join(', ');
  delete clip.keywords;
} else if (!clip.description) {
  clip.description = "";
}
```

---

### **2.3 Shot Number Field (NEW)**

**R1.0 (Demo - MISSING):**
```json
{
  // Field did not exist
}
```

**R1.1 (Authoritative - REQUIRED):**
```json
{
  "shotNumber": 25
}
```

**User Confirmation:**
> "IA DOES generate it"

**Implementation Details:**
- IA generates sequential shot numbers
- Shot number is SEPARATE field (NOT appended to `shotName`)
- CEP Panel should DISPLAY shot number (read-only)
- Example: Shot #25 has `shotName: "kitchen-oven-cleaning-ESTAB"` (no #25 suffix)

**Impact:**
- CEP Panel adds read-only shot number display
- No need to parse shot number from `shotName` string
- IA maintains sequential numbering

**Migration Action:**
```javascript
// Migration script
if (!clip.shotNumber) {
  clip.shotNumber = 0; // Default value (IA will assign proper number)
}
```

---

### **2.4 Lock Mechanism Fields (NEW)**

**R1.0 (Demo - MISSING):**
```json
{
  // Lock fields did not exist
}
```

**R1.1 (Authoritative - REQUIRED):**
```json
{
  "locked": false,
  "lockedBy": null,
  "lockedAt": null
}
```

**User Context:**
> IA has "COMPLETE" button that sets `locked: true`

**Implementation Details:**
- IA sets `locked: true` via "COMPLETE" button
- CEP Panel MUST respect lock state (disable editing when `locked === true`)
- Lock mechanism is **partial implementation** (already exists in IA)
- NOT a Phase 2 feature (user correction)

**Lock State Examples:**

**Unlocked (Editable):**
```json
{
  "locked": false,
  "lockedBy": null,
  "lockedAt": null
}
```

**Locked (Read-Only):**
```json
{
  "locked": true,
  "lockedBy": "editor-name",
  "lockedAt": "2025-11-18T14:45:00.000Z"
}
```

**Impact:**
- CEP Panel must check `locked` state before allowing edits
- Disable form fields when `locked === true`
- Show lock indicator (who locked, when)
- Display error message on edit attempt

**Migration Action:**
```javascript
// Migration script
if (clip.locked === undefined) {
  clip.locked = false;
  clip.lockedBy = null;
  clip.lockedAt = null;
}
```

---

### **2.5 Unchanged Fields**

These fields remain the same between R1.0 and R1.1:

**Identity Fields:**
- `id`, `originalFilename`, `currentFilename`, `filePath`, `extension`, `fileType`

**Structured Name Components:**
- `location`, `subject`, `action`, `shotType`

**Processing Metadata:**
- `processedByAI`

**Audit Trail:**
- `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`

**File-Level Metadata:**
- `_schema`, `_metadata` (project context, timestamps)

---

## 3. MIGRATION SCRIPT

### **Complete R1.0 → R1.1 Migration**

```javascript
/**
 * Migrate metadata file from R1.0 (demo schema) to R1.1 (authoritative schema)
 *
 * @param {Object} oldData - R1.0 metadata object
 * @returns {Object} R1.1 metadata object
 */
function migrateR10ToR11(oldData) {
  var newData = {
    _schema: "R1.1",
    _metadata: oldData._metadata || {
      projectCode: "",
      shootFolder: "",
      createdAt: new Date().toISOString(),
      createdBy: "migration-script",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "migration-script",
      version: "1.0.0"
    }
  };

  // Update file-level metadata
  newData._metadata.modifiedAt = new Date().toISOString();
  newData._metadata.modifiedBy = "migration-script";

  // Migrate clip entries
  for (var clipId in oldData) {
    if (clipId.startsWith('_')) continue; // Skip metadata fields

    var oldClip = oldData[clipId];
    var newClip = {
      // Identity fields (unchanged)
      id: oldClip.id || clipId,
      originalFilename: oldClip.originalFilename || "",
      currentFilename: oldClip.currentFilename || "",
      filePath: oldClip.filePath || "",
      extension: oldClip.extension || "",
      fileType: oldClip.fileType || "video",

      // BREAKING CHANGE: mainName → shotName
      shotName: oldClip.shotName || oldClip.mainName || "",

      // NEW FIELD: shotNumber
      shotNumber: oldClip.shotNumber || 0,

      // BREAKING CHANGE: keywords[] → description (string)
      description: oldClip.description ||
                   (Array.isArray(oldClip.keywords) ? oldClip.keywords.join(', ') : ""),

      // Structured fields (unchanged)
      location: oldClip.location || "",
      subject: oldClip.subject || "",
      action: oldClip.action || "",
      shotType: oldClip.shotType || "",

      // Processing metadata (unchanged)
      processedByAI: oldClip.processedByAI || false,

      // NEW FIELDS: Lock mechanism
      locked: oldClip.locked || false,
      lockedBy: oldClip.lockedBy || null,
      lockedAt: oldClip.lockedAt || null,

      // Audit trail
      createdAt: oldClip.createdAt || new Date().toISOString(),
      createdBy: oldClip.createdBy || "unknown",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "migration-script"
    };

    newData[clipId] = newClip;
  }

  return newData;
}

/**
 * Migrate metadata file in-place
 *
 * @param {string} filePath - Path to .ingest-metadata.json
 */
function migrateMetadataFile(filePath) {
  // Read existing file
  var file = new File(filePath);
  if (!file.exists) {
    throw new Error("Metadata file not found: " + filePath);
  }

  file.open('r');
  var oldData = JSON.parse(file.read());
  file.close();

  // Check schema version
  if (oldData._schema === "R1.1") {
    // Already migrated
    return { alreadyMigrated: true };
  }

  // Perform migration
  var newData = migrateR10ToR11(oldData);

  // Write back to file
  file.open('w');
  file.write(JSON.stringify(newData, null, 2));
  file.close();

  return { success: true, migratedClips: Object.keys(newData).filter(function(k) { return !k.startsWith('_'); }).length };
}
```

---

## 4. CEP PANEL CODE CHANGES

### **4.1 Form Field Bindings**

**BEFORE (R1.0):**
```javascript
// Load clip into form
document.getElementById('main-name').value = clip.mainName || "";
document.getElementById('keywords').value = (clip.keywords || []).join(', ');
```

**AFTER (R1.1):**
```javascript
// Load clip into form
document.getElementById('shot-name').value = clip.shotName || "";
document.getElementById('shot-number').value = clip.shotNumber || 0; // NEW: Read-only field
document.getElementById('description').value = clip.description || "";

// Check lock state
if (clip.locked === true) {
  disableFormEditing(clip.lockedBy, clip.lockedAt);
}
```

---

### **4.2 Metadata Save**

**BEFORE (R1.0):**
```javascript
// Save metadata
clip.mainName = document.getElementById('main-name').value;
clip.keywords = document.getElementById('keywords').value.split(',').map(function(k) { return k.trim(); });
```

**AFTER (R1.1):**
```javascript
// Check lock state before saving
if (clip.locked === true) {
  alert('Cannot edit locked clip (locked by: ' + clip.lockedBy + ')');
  return;
}

// Save metadata
clip.shotName = document.getElementById('shot-name').value;
clip.description = document.getElementById('description').value; // STRING, not array
// shotNumber is read-only (IA manages)
```

---

### **4.3 Lock Enforcement**

**NEW IMPLEMENTATION (R1.1):**
```javascript
/**
 * Check if clip can be edited (lock enforcement)
 */
function canEditClip(clip) {
  if (clip.locked === true) {
    alert(
      "This clip is locked and cannot be edited.\n\n" +
      "Locked by: " + (clip.lockedBy || "Unknown") + "\n" +
      "Locked at: " + (clip.lockedAt ? new Date(clip.lockedAt).toLocaleString() : "Unknown")
    );
    return false;
  }
  return true;
}

/**
 * Disable form fields when clip is locked
 */
function disableFormEditing(lockedBy, lockedAt) {
  // Disable all input fields
  var fields = ['location', 'subject', 'action', 'shot-type', 'description'];
  for (var i = 0; i < fields.length; i++) {
    document.getElementById(fields[i]).disabled = true;
  }

  // Show lock indicator
  document.getElementById('lock-status').innerText =
    "🔒 LOCKED by " + (lockedBy || "Unknown") +
    " (" + (lockedAt ? new Date(lockedAt).toLocaleString() : "Unknown") + ")";
  document.getElementById('lock-status').style.display = 'block';

  // Disable Apply button
  document.getElementById('apply-metadata').disabled = true;
}
```

---

## 5. XMP MAPPING CHANGES

### **5.1 Field Mapping Updates**

**BEFORE (R1.0):**
```javascript
// Write to XMP
xmpString = updateXMPField(xmpString, 'xmpDM', 'shotName', clip.mainName);
xmpString = updateXMPField(xmpString, 'dc', 'description', clip.keywords.join(', '));
```

**AFTER (R1.1):**
```javascript
// Write to XMP
xmpString = updateXMPField(xmpString, 'xmpDM', 'shotName', clip.shotName);
xmpString = updateXMPField(xmpString, 'dc', 'description', clip.description); // Already string
```

**Note:** No change to XMP field names - only JSON field names changed.

---

## 6. METADATA FILE LOCATION

### **R1.0 (Demo - INCORRECT ASSUMPTION)**

Assumed metadata lived in RAW folder (based on exploratory files):
```
/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/.ingest-metadata.json
```

### **R1.1 (Authoritative - CORRECT)**

User confirmation: Metadata lives in **proxy folder ONLY**:
```
/LucidLink/EAV036-proxies/shoot1-20251103/.ingest-metadata.json
```

**Impact:**
- CEP Panel must look for metadata in proxy folder (LucidLink working directory)
- No duplication to RAW folder
- Single source of truth in proxy folder

**Code Change:**
```javascript
// BEFORE (R1.0 - INCORRECT)
var metadataPath = '/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/.ingest-metadata.json';

// AFTER (R1.1 - CORRECT)
var metadataPath = '/LucidLink/EAV036-proxies/shoot1-20251103/.ingest-metadata.json';
```

---

## 7. VALIDATION CHECKLIST

### **CEP Panel Implementation Updates**

- [ ] **Field Renaming**
  - [ ] Replace `clip.mainName` with `clip.shotName`
  - [ ] Replace `clip.keywords[]` with `clip.description` (string)
  - [ ] Update form field IDs (`main-name` → `shot-name`)

- [ ] **New Fields**
  - [ ] Add `shotNumber` display (read-only)
  - [ ] Add lock fields (`locked`, `lockedBy`, `lockedAt`)
  - [ ] Implement lock state check before edits

- [ ] **Lock Enforcement**
  - [ ] Check `clip.locked` before allowing edits
  - [ ] Disable form fields when locked
  - [ ] Show lock indicator (who, when)
  - [ ] Display error on edit attempt

- [ ] **Metadata Location**
  - [ ] Update file path logic (proxy folder ONLY)
  - [ ] Remove RAW folder assumptions
  - [ ] Use LucidLink working directory

- [ ] **XMP Mapping**
  - [ ] Verify `xmpDM:shotName` mapping
  - [ ] Verify `dc:description` mapping (string, not array)
  - [ ] Fix `xmpDM:LogComment` (capital 'C') bug

- [ ] **Migration Support**
  - [ ] Detect R1.0 schema (missing `_schema` or `_schema !== "R1.1"`)
  - [ ] Offer migration on first load
  - [ ] Backup original file before migration

---

## 8. ROLLOUT STRATEGY

### **Phase 1: CEP Panel Updates (Current)**
1. Update CEP Panel code to use R1.1 schema
2. Implement lock enforcement
3. Add shot number display
4. Test with R1.1 metadata files

### **Phase 2: IA Validation (Coordination Required)**
1. Confirm IA already uses R1.1 schema (user indicated it does)
2. Verify IA writes all required fields
3. Test IA "COMPLETE" button lock mechanism
4. Validate metadata file location (proxy folder)

### **Phase 3: Production Deployment**
1. Deploy updated CEP Panel to production
2. Monitor for schema compatibility issues
3. Provide migration script if legacy R1.0 files exist
4. Update documentation with R1.1 examples

---

## 9. RISK ASSESSMENT

### **High Risk**

| Risk | Mitigation |
|------|------------|
| **CEP Panel reads old `mainName` field** | Add migration logic to read both fields (prefer `shotName`) |
| **IA writes `keywords[]` array** | User confirmed IA uses `description` string - no risk |
| **Lock mechanism not implemented in IA** | User confirmed partial implementation exists (COMPLETE button) |

### **Medium Risk**

| Risk | Mitigation |
|------|------------|
| **Metadata file in wrong location** | Update CEP file path logic to proxy folder only |
| **Shot number missing in old files** | Default to 0 if missing, IA will assign proper number |

### **Low Risk**

| Risk | Mitigation |
|------|------------|
| **XMP field mapping unchanged** | No changes required - only JSON field names changed |
| **Structured fields unchanged** | No migration needed for location/subject/action/shotType |

---

## 10. TESTING CHECKLIST

### **R1.1 Schema Compatibility**

- [ ] CEP Panel loads R1.1 metadata file correctly
- [ ] Form displays `shotName` field (not `mainName`)
- [ ] Form displays `description` string (not `keywords[]` array)
- [ ] Form displays `shotNumber` (read-only)

### **Lock Mechanism**

- [ ] Form disables when `locked: true`
- [ ] Lock indicator shows who/when
- [ ] Apply button disabled when locked
- [ ] Error message on edit attempt

### **Migration Support**

- [ ] CEP Panel detects R1.0 schema
- [ ] Migration converts `mainName` → `shotName`
- [ ] Migration converts `keywords[]` → `description` string
- [ ] Migration adds missing fields (shotNumber, lock fields)
- [ ] Migrated file validates against R1.1 schema

### **XMP Integration**

- [ ] XMP writes `shotName` to `xmpDM:shotName`
- [ ] XMP writes `description` to `dc:description`
- [ ] XMP persistence verified (reload shows same data)

---

## 11. REFERENCES

**Schema Documentation:**
- `005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md` - Complete R1.1 schema
- `006-DOC-SCHEMA-R1-1-EXAMPLE.md` - JSON examples and validation

**User Validation:**
- 2025-11-18 - User confirmed actual IA implementation details
- Field naming: `shotName` (NOT `mainName`)
- Metadata field: `description` STRING (NOT `keywords[]` array)
- Shot number: Separate field (IA generates)
- Lock mechanism: Partial implementation via COMPLETE button
- Metadata location: Proxy folder ONLY

**Related Documentation:**
- `CLAUDE.md` - CEP Panel operational guide
- `000001-DOC-METADATA-STRATEGY-SHARED.md` - XMP field mapping

---

**Migration Status:** SPECIFICATION COMPLETE
**Next Actions:**
1. Implement CEP Panel code changes
2. Test with R1.1 metadata files
3. Validate IA compatibility
4. Deploy to production

**Last Updated:** 2025-11-18
