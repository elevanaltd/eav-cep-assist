# Schema Migration Guide - Old Format → R1.1 (Production-Validated)

**Document Type:** Migration Guide
**Source Schema:** Old demo/production files (mainName, description string, locked boolean)
**Target Schema:** R1.1 (shotName, keywords array, lockedFields array, _completed flag)
**Last Updated:** 2025-11-18

---

## 1. MIGRATION OVERVIEW

### **1.1 Critical Breaking Changes**

| Old Field | R1.1 Field | Change Type | Migration Required |
|-----------|------------|-------------|-------------------|
| `mainName` | `shotName` | RENAME | ✅ Field rename |
| `description` (string) | `keywords` (array) | TYPE CHANGE | ✅ String → Array conversion |
| `locked` (boolean) | `lockedFields` (array) | TYPE CHANGE | ✅ Boolean → Array conversion |
| (missing) | `_completed` | NEW FIELD | ✅ Add root-level flag |
| `shotName` (no #N) | `shotName` (with #N) | FORMAT CHANGE | ✅ Append shotNumber |

---

### **1.2 Migration Priority**

**HIGH PRIORITY (Breaking):**
- `mainName` → `shotName` rename (CEP Panel won't load old files)
- `description` string → `keywords` array (Type mismatch errors)
- `locked` boolean → `lockedFields` array (Lock enforcement broken)

**MEDIUM PRIORITY (Functional):**
- Add `_completed` flag (Folder completion warnings won't work)
- Update shotName format to include `#N` (Consistency with IA output)

**LOW PRIORITY (Optional):**
- Add missing identity fields (`creationTimestamp`, `cameraId`)

---

## 2. FIELD-BY-FIELD MIGRATION

### **2.1 Main Name Field (BREAKING)**

**Old Format:**
```json
"mainName": "kitchen-oven-cleaning-MID"
```

**R1.1 Format:**
```json
"shotName": "kitchen-oven-cleaning-MID-#3"
```

**Migration Code:**
```javascript
// Migration: mainName → shotName (add #N suffix)
function migrateShotName(oldClip) {
  var shotName = oldClip.mainName || oldClip.shotName || "";
  var shotNumber = oldClip.shotNumber || 0;

  // Add #N suffix if missing
  if (shotNumber > 0 && shotName.indexOf('#') === -1) {
    shotName = shotName + "-#" + shotNumber;
  }

  return shotName;
}

// Example:
var oldClip = { mainName: "kitchen-oven-cleaning-MID", shotNumber: 3 };
var newShotName = migrateShotName(oldClip);
// Result: "kitchen-oven-cleaning-MID-#3"
```

---

### **2.2 Keywords Field (BREAKING)**

**Old Format (String):**
```json
"description": "door, chain, lock"
```

**R1.1 Format (Array):**
```json
"keywords": ["door", "chain", "lock"]
```

**Migration Code:**
```javascript
// Migration: description string → keywords array
function migrateKeywords(oldClip) {
  // Handle old description field (string)
  if (oldClip.description && typeof oldClip.description === 'string') {
    return oldClip.description.split(',').map(function(k) {
      return k.trim();
    }).filter(function(k) {
      return k.length > 0;
    });
  }

  // Handle already-migrated keywords field (array)
  if (Array.isArray(oldClip.keywords)) {
    return oldClip.keywords;
  }

  // Default: empty array
  return [];
}

// Example:
var oldClip1 = { description: "door, chain, lock" };
var keywords1 = migrateKeywords(oldClip1);
// Result: ["door", "chain", "lock"]

var oldClip2 = { description: "" };
var keywords2 = migrateKeywords(oldClip2);
// Result: []
```

---

### **2.3 Lock Mechanism (BREAKING)**

**Old Format (Boolean):**
```json
"locked": true,
"lockedBy": "editor-name",
"lockedAt": "2025-11-18T14:45:00.000Z"
```

**R1.1 Format (Array):**
```json
"lockedFields": ["location", "subject", "action", "shotType", "keywords"]
```

**Migration Code:**
```javascript
// Migration: locked boolean → lockedFields array
function migrateLockedFields(oldClip) {
  // If old clip was locked, lock ALL editable fields
  if (oldClip.locked === true) {
    return ["location", "subject", "action", "shotType", "keywords"];
  }

  // If old clip had lockedFields array (already R1.1), preserve it
  if (Array.isArray(oldClip.lockedFields)) {
    return oldClip.lockedFields;
  }

  // Default: no fields locked
  return [];
}

// Example:
var oldClip1 = { locked: true };
var lockedFields1 = migrateLockedFields(oldClip1);
// Result: ["location", "subject", "action", "shotType", "keywords"]

var oldClip2 = { locked: false };
var lockedFields2 = migrateLockedFields(oldClip2);
// Result: []
```

**Note:** R1.1 uses FIELD-LEVEL locks (more granular than old boolean lock). When migrating, we lock ALL fields to preserve the original intent of "clip is locked".

---

### **2.4 Completion Flag (NEW)**

**Old Format (Missing):**
```json
{
  "_schema": "1.0",
  "EAV0TEST2": { ... }
}
```

**R1.1 Format (Root-Level Flag):**
```json
{
  "_schema": "2.0",
  "_completed": false,
  "EAV0TEST2": { ... }
}
```

**Migration Code:**
```javascript
// Migration: Add _completed flag (default: false)
function addCompletionFlag(oldData) {
  // If _completed already exists, preserve it
  if (typeof oldData._completed === 'boolean') {
    return oldData._completed;
  }

  // Default: folder not marked complete
  return false;
}

// Example:
var oldData = { _schema: "1.0", EAV0TEST2: { ... } };
var newData = {
  _schema: "2.0",
  _completed: addCompletionFlag(oldData),
  EAV0TEST2: { ... }
};
// Result: { _schema: "2.0", _completed: false, ... }
```

---

## 3. COMPLETE MIGRATION SCRIPT

### **3.1 ExtendScript Migration Function**

```javascript
// jsx/host.jsx: Migrate old schema → R1.1
function migrateMetadataToR11(oldData) {
  var newData = {
    _schema: "2.0",
    _completed: addCompletionFlag(oldData)
  };

  for (var clipId in oldData) {
    // Skip root-level metadata fields
    if (clipId.startsWith('_')) {
      continue;
    }

    var oldClip = oldData[clipId];

    // Construct new clip entry
    var newClip = {
      // Identity fields (preserve or add defaults)
      id: oldClip.id || clipId,
      originalFilename: oldClip.originalFilename || "",
      currentFilename: oldClip.currentFilename || oldClip.originalFilename || "",
      filePath: oldClip.filePath || "",
      extension: oldClip.extension || "",
      fileType: oldClip.fileType || "video",
      creationTimestamp: oldClip.creationTimestamp || oldClip.createdAt || "",
      cameraId: oldClip.cameraId || oldClip.id || clipId,

      // MIGRATION: mainName → shotName (with #N)
      shotNumber: oldClip.shotNumber || 0,
      shotName: migrateShotName(oldClip),

      // MIGRATION: description string → keywords array
      keywords: migrateKeywords(oldClip),

      // Structured fields (preserve)
      location: oldClip.location || "",
      subject: oldClip.subject || "",
      action: oldClip.action || "",
      shotType: oldClip.shotType || "",

      // Processing metadata
      processedByAI: oldClip.processedByAI || false,

      // MIGRATION: locked boolean → lockedFields array
      lockedFields: migrateLockedFields(oldClip),

      // Audit timestamps
      createdAt: oldClip.createdAt || new Date().toISOString(),
      createdBy: oldClip.createdBy || "ingest-assistant",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "migration-script",
      version: "1.1.0"
    };

    newData[clipId] = newClip;
  }

  return newData;
}
```

---

### **3.2 Usage Example**

```javascript
// Load old metadata file
var oldFilePath = '/test-videos-proxy/.ingest-metadata.json';
var oldFile = new File(oldFilePath);
oldFile.open('r');
var oldData = JSON.parse(oldFile.read());
oldFile.close();

// Migrate to R1.1
var newData = migrateMetadataToR11(oldData);

// Write migrated data to new file
var newFilePath = '/test-videos-proxy/.ingest-metadata-r1.1.json';
var newFile = new File(newFilePath);
newFile.open('w');
newFile.write(JSON.stringify(newData, null, 2));
newFile.close();

// Validation: Check schema version
if (newData._schema !== "2.0") {
  alert("Migration failed: Schema version mismatch");
} else {
  alert("Migration successful: " + Object.keys(newData).length - 2 + " clips migrated");
}
```

---

## 4. VALIDATION AFTER MIGRATION

### **4.1 Schema Version Check**

```javascript
// Validate schema version
function validateSchemaVersion(data) {
  if (data._schema !== "2.0") {
    return {
      valid: false,
      error: "Invalid schema version: " + data._schema + " (expected: 2.0)"
    };
  }
  return { valid: true };
}
```

---

### **4.2 Required Fields Check**

```javascript
// Validate required fields for each clip
function validateClipFields(clip, clipId) {
  var errors = [];

  // Identity fields
  if (!clip.id) errors.push(clipId + ": Missing id");
  if (!clip.originalFilename) errors.push(clipId + ": Missing originalFilename");
  if (!clip.filePath) errors.push(clipId + ": Missing filePath");
  if (!clip.extension) errors.push(clipId + ": Missing extension");
  if (!clip.fileType) errors.push(clipId + ": Missing fileType");

  // Core metadata fields
  if (clip.shotName === undefined) errors.push(clipId + ": Missing shotName");
  if (clip.shotNumber === undefined) errors.push(clipId + ": Missing shotNumber");
  if (clip.keywords === undefined) errors.push(clipId + ": Missing keywords");

  // Type validation
  if (typeof clip.shotName !== 'string') {
    errors.push(clipId + ": shotName must be string");
  }
  if (typeof clip.shotNumber !== 'number') {
    errors.push(clipId + ": shotNumber must be number");
  }
  if (!Array.isArray(clip.keywords)) {
    errors.push(clipId + ": keywords must be ARRAY (not string)");
  }
  if (!Array.isArray(clip.lockedFields)) {
    errors.push(clipId + ": lockedFields must be ARRAY (not boolean)");
  }

  // Structured fields
  if (!clip.location) errors.push(clipId + ": Missing location");
  if (!clip.subject) errors.push(clipId + ": Missing subject");
  if (!clip.action) errors.push(clipId + ": Missing action");
  if (!clip.shotType) errors.push(clipId + ": Missing shotType");

  return errors.length > 0 ? errors : null;
}
```

---

### **4.3 Root-Level Fields Check**

```javascript
// Validate root-level metadata
function validateRootFields(data) {
  var errors = [];

  if (data._schema !== "2.0") {
    errors.push("Invalid _schema (expected: 2.0)");
  }

  if (typeof data._completed !== 'boolean') {
    errors.push("Missing or invalid _completed flag (must be boolean)");
  }

  return errors.length > 0 ? errors : null;
}
```

---

### **4.4 Complete Validation Function**

```javascript
// Validate entire migrated metadata file
function validateMigratedMetadata(data) {
  var allErrors = [];

  // 1. Validate root-level fields
  var rootErrors = validateRootFields(data);
  if (rootErrors) {
    allErrors = allErrors.concat(rootErrors);
  }

  // 2. Validate each clip entry
  for (var clipId in data) {
    if (clipId.startsWith('_')) continue; // Skip metadata fields

    var clipErrors = validateClipFields(data[clipId], clipId);
    if (clipErrors) {
      allErrors = allErrors.concat(clipErrors);
    }
  }

  if (allErrors.length > 0) {
    return {
      valid: false,
      errors: allErrors
    };
  }

  return { valid: true };
}
```

---

## 5. COMMON MIGRATION SCENARIOS

### **5.1 Scenario 1: Demo Files (mainName + description string)**

**Before Migration:**
```json
{
  "_schema": "R1.0",
  "EA001932": {
    "id": "EA001932",
    "originalFilename": "EA001932.MOV",
    "filePath": "/LucidLink/.../EA001932_proxy.mov",
    "extension": ".mov",
    "fileType": "video",

    "mainName": "hallway-front-door-safety-chain-CU",
    "shotNumber": 25,
    "description": "door, chain, lock",

    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",
    "shotType": "CU",

    "processedByAI": true,
    "locked": false
  }
}
```

**After Migration:**
```json
{
  "_schema": "2.0",
  "_completed": false,
  "EA001932": {
    "id": "EA001932",
    "originalFilename": "EA001932.MOV",
    "currentFilename": "EA001932.MOV",
    "filePath": "/LucidLink/.../EA001932_proxy.mov",
    "extension": ".mov",
    "fileType": "video",
    "creationTimestamp": "",
    "cameraId": "EA001932",

    "shotNumber": 25,
    "shotName": "hallway-front-door-safety-chain-CU-#25",
    "keywords": ["door", "chain", "lock"],

    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",
    "shotType": "CU",

    "processedByAI": true,
    "lockedFields": [],

    "createdAt": "2025-11-18T10:00:00.000Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T10:00:00.000Z",
    "modifiedBy": "migration-script",
    "version": "1.1.0"
  }
}
```

---

### **5.2 Scenario 2: Locked Clip (Boolean Lock)**

**Before Migration:**
```json
{
  "EA001933": {
    "mainName": "kitchen-oven-cleaning-ESTAB",
    "shotNumber": 26,
    "description": "stainless-steel, gas-range",
    "locked": true,
    "lockedBy": "editor-name",
    "lockedAt": "2025-11-18T14:45:00.000Z"
  }
}
```

**After Migration:**
```json
{
  "EA001933": {
    "shotNumber": 26,
    "shotName": "kitchen-oven-cleaning-ESTAB-#26",
    "keywords": ["stainless-steel", "gas-range"],
    "lockedFields": ["location", "subject", "action", "shotType", "keywords"]
  }
}
```

**Note:** Old `locked: true` → All fields locked in R1.1

---

### **5.3 Scenario 3: Empty Keywords**

**Before Migration:**
```json
{
  "EAV0TEST2": {
    "mainName": "kitchen-oven-cleaning-MID",
    "shotNumber": 3,
    "description": ""
  }
}
```

**After Migration:**
```json
{
  "EAV0TEST2": {
    "shotName": "kitchen-oven-cleaning-MID-#3",
    "shotNumber": 3,
    "keywords": []
  }
}
```

---

## 6. ROLLBACK PROCEDURE

### **6.1 When to Rollback**

- Migration validation fails
- CEP Panel errors after migration
- Data corruption detected

### **6.2 Rollback Steps**

1. **Restore backup file:**
   ```javascript
   var backupPath = '/test-videos-proxy/.ingest-metadata-backup.json';
   var currentPath = '/test-videos-proxy/.ingest-metadata.json';

   var backupFile = new File(backupPath);
   var currentFile = new File(currentPath);

   // Copy backup to current
   backupFile.copy(currentPath);
   ```

2. **Verify rollback:**
   ```javascript
   var file = new File(currentPath);
   file.open('r');
   var data = JSON.parse(file.read());
   file.close();

   if (data._schema === "R1.0" || data._schema === "1.0") {
     alert("Rollback successful: Restored to old schema");
   } else {
     alert("Rollback failed: Schema still R1.1");
   }
   ```

---

## 7. MIGRATION CHECKLIST

### **Pre-Migration**

- [ ] Backup original `.ingest-metadata.json` file
- [ ] Verify old schema version (`_schema` field)
- [ ] Count total clips in old file
- [ ] Document custom fields (if any)

### **During Migration**

- [ ] Run migration script on backup copy
- [ ] Validate migrated schema version (`_schema === "2.0"`)
- [ ] Validate `_completed` flag exists
- [ ] Validate all clips have `shotName` field
- [ ] Validate all clips have `keywords` array (NOT string)
- [ ] Validate all clips have `lockedFields` array (NOT boolean)

### **Post-Migration**

- [ ] Test CEP Panel with migrated file
- [ ] Verify field locks work correctly
- [ ] Verify keywords display in UI
- [ ] Verify shotName includes `#N` format
- [ ] Verify folder completion warning works
- [ ] Backup migrated file

---

## 8. TROUBLESHOOTING

### **8.1 Error: "keywords must be ARRAY (not string)"**

**Cause:** Migration didn't convert `description` string to `keywords` array

**Fix:**
```javascript
// Manual fix for specific clip
data.EAV0TEST2.keywords = data.EAV0TEST2.description.split(',').map(function(k) {
  return k.trim();
});
delete data.EAV0TEST2.description; // Remove old field
```

---

### **8.2 Error: "lockedFields must be ARRAY (not boolean)"**

**Cause:** Migration didn't convert `locked` boolean to `lockedFields` array

**Fix:**
```javascript
// Manual fix for specific clip
if (data.EAV0TEST2.locked === true) {
  data.EAV0TEST2.lockedFields = ["location", "subject", "action", "shotType", "keywords"];
}
delete data.EAV0TEST2.locked;
delete data.EAV0TEST2.lockedBy;
delete data.EAV0TEST2.lockedAt;
```

---

### **8.3 Error: "Missing shotName field"**

**Cause:** Old file used `mainName`, migration didn't rename

**Fix:**
```javascript
// Manual fix for specific clip
data.EAV0TEST2.shotName = data.EAV0TEST2.mainName + "-#" + data.EAV0TEST2.shotNumber;
delete data.EAV0TEST2.mainName; // Remove old field
```

---

## 9. REFERENCES

**Related Documents:**
- `005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md` - R1.1 schema specification
- `008-DOC-CEP-R1-1-IMPLEMENTATION-GUIDE.md` - Implementation examples
- `.coord/test-fixtures/.ingest-metadata-r1.1.json` - Production test fixture

**Migration Test Data:**
- Old schema test file: `006-DOC-SCHEMA-R1-1-EXAMPLE-OLD.md`
- New schema test file: `.coord/test-fixtures/.ingest-metadata-r1.1.json`

---

**END OF MIGRATION GUIDE**
