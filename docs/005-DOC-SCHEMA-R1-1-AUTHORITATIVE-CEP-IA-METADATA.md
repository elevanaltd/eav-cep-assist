# R1.1 Authoritative JSON Schema - CEP Panel + Ingest Assistant Metadata

**Schema Version:** R1.1
**Document Status:** PRODUCTION-VALIDATED (Empirical Test Evidence)
**Last Updated:** 2025-11-18
**Test Source:** Actual Premiere Pro test with 3 clips + ExtendScript path analysis

---

## 1. VALIDATION AUTHORITY

**EMPIRICAL TEST SOURCES:**
- ✅ User-confirmed field names and formats
- ✅ Production JSON file from actual test (3 clips)
- ✅ ExtendScript `clip.getProxyPath()` validation
- ✅ Premiere Pro integration test (proxy attachment verified)

**AUTHORITATIVE ANSWERS (User + Test Validated):**
1. ✅ Field name: `shotName` (NOT `mainName`)
2. ✅ Metadata format: `keywords: []` array (NOT `description` string)
3. ✅ shotNumber format: INCLUDED in shotName string (`"kitchen-oven-cleaning-MID-#3"`)
4. ✅ Lock mechanism: Field-level `lockedFields: []` array (NOT `locked: boolean`)
5. ✅ Completion flag: `_completed: boolean` (folder-level completion status)
6. ✅ JSON location: Proxy folder PRIMARY, raw folder FALLBACK

---

## 2. COMPLETE R1.1 JSON SCHEMA

### **Example: `.ingest-metadata.json`**

**File Location (Production):**
```
/test-videos-proxy/.ingest-metadata.json
```

**Complete Schema Example:**
```json
{
  "_schema": "2.0",
  "_completed": false,
  "EAV0TEST2": {
    "id": "EAV0TEST2",
    "originalFilename": "EAV0TEST2.MOV",
    "currentFilename": "EAV0TEST2.MOV",
    "filePath": "/Volumes/.../test-videos-raw/EAV0TEST2.MOV",
    "extension": ".MOV",
    "fileType": "video",
    "creationTimestamp": "2024-09-26T10:27:08Z",
    "cameraId": "EAV0TEST2",

    "shotNumber": 3,
    "shotName": "kitchen-oven-cleaning-MID-#3",
    "keywords": [],

    "location": "kitchen",
    "subject": "oven",
    "action": "cleaning",
    "shotType": "MID",

    "processedByAI": true,
    "lockedFields": [],

    "createdAt": "2025-11-18T02:59:32Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T02:59:32Z",
    "modifiedBy": "ingest-assistant",
    "version": "1.1.0"
  },
  "EAV0TEST3": {
    "id": "EAV0TEST3",
    "originalFilename": "EAV0TEST3.MOV",
    "currentFilename": "EAV0TEST3.MOV",
    "filePath": "/Volumes/.../test-videos-raw/EAV0TEST3.MOV",
    "extension": ".MOV",
    "fileType": "video",
    "creationTimestamp": "2024-09-26T10:28:15Z",
    "cameraId": "EAV0TEST3",

    "shotNumber": 1,
    "shotName": "hallway-front-door-safety-chain-CU-#1",
    "keywords": ["door", "chain", "lock"],

    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",
    "shotType": "CU",

    "processedByAI": true,
    "lockedFields": ["location", "subject"],

    "createdAt": "2025-11-18T02:59:32Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T03:15:00Z",
    "modifiedBy": "cep-panel",
    "version": "1.1.0"
  }
}
```

---

## 3. FIELD DOCUMENTATION

### **3.1 Root-Level Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_schema` | `string` | ✅ | Schema version identifier (e.g., `"2.0"`) |
| `_completed` | `boolean` | ✅ | Folder-level completion status (IA "COMPLETE" button sets to `true`) |
| `{clipId}` | `object` | ✅ | Clip metadata entries (key = clip ID, e.g., `EAV0TEST2`) |

**CRITICAL NOTE:** `_completed` is a **folder-level flag** set by IA's "COMPLETE" button. When `true`, the entire shoot folder is marked complete. CEP Panel should warn users when editing clips from completed folders.

---

### **3.2 Clip-Level Metadata (`{clipId}` object)**

#### **Identity Fields**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | ✅ | - | Clip identifier (e.g., `"EAV0TEST2"`) - MUST match object key |
| `originalFilename` | `string` | ✅ | - | Original RAW filename (e.g., `"EAV0TEST2.MOV"`) |
| `currentFilename` | `string` | ✅ | - | Current filename (same as original in test data) |
| `filePath` | `string` | ✅ | - | Absolute path to RAW file (NOTE: JSON lives in proxy folder, path points to raw) |
| `extension` | `string` | ✅ | - | File extension (e.g., `".MOV"`) |
| `fileType` | `string` | ✅ | - | File type (`"video"` or `"image"`) |
| `creationTimestamp` | `string` (ISO8601) | ✅ | - | File creation timestamp from camera metadata |
| `cameraId` | `string` | ✅ | - | Camera identifier (extracted from filename, e.g., `"EAV0TEST2"`) |

---

#### **Core Metadata Fields**

| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `shotNumber` | `number` | ✅ | `0` | **Sequential shot number** (IA-generated, also included in shotName) | `3` |
| `shotName` | `string` | ✅ | `""` | **Generated name WITH shot number** (format: `location-subject-action-shotType-#N`) | `"kitchen-oven-cleaning-MID-#3"` |
| `keywords` | `array<string>` | ✅ | `[]` | **Keywords array** (NOT description string) | `["door", "chain", "lock"]` |

**CRITICAL VALIDATION FINDINGS:**
- **`shotName`** (NOT `mainName`) - User-confirmed actual IA field name
- **`shotNumber`** is BOTH a separate field AND included in `shotName` string format
- **`keywords`** is an ARRAY - NOT a `description` string field
- **shotName format:** `"{location}-{subject}-{action}-{shotType}-#{shotNumber}"`

**Example from Test JSON (line 14):**
```json
"shotNumber": 3,
"shotName": "kitchen-oven-cleaning-MID-#3"
```

---

#### **Structured Name Components**

| Field | Type | Required | Default | Description | Example |
|-------|------|----------|---------|-------------|---------|
| `location` | `string` | ✅ | `""` | Physical location/room | `"kitchen"`, `"hallway"` |
| `subject` | `string` | ✅ | `""` | Main subject/object in shot | `"oven"`, `"front-door"` |
| `action` | `string` | ✅ | `""` | Action being performed | `"cleaning"`, `"safety-chain"` |
| `shotType` | `string` | ✅ | `""` | Shot type code (ESTAB, CU, MCU, MS, WS, MID, etc.) | `"CU"`, `"MID"` |

**Shot Name Generation Algorithm:**
```javascript
// CEP Panel: Generate shotName from components + shotNumber
function generateShotName(location, subject, action, shotType, shotNumber) {
  return location + "-" + subject + "-" + action + "-" + shotType + "-#" + shotNumber;
}
// Example: generateShotName("kitchen", "oven", "cleaning", "MID", 3)
// Returns: "kitchen-oven-cleaning-MID-#3"
```

---

#### **Processing & Lock Metadata**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `processedByAI` | `boolean` | ✅ | `false` | Whether AI generated metadata (IA sets to `true`) |
| `lockedFields` | `array<string>` | ✅ | `[]` | **Field-level lock array** (prevents editing specific fields) |

**Lock Mechanism (Field-Level):**
```json
"lockedFields": ["location", "subject"]
```

**CEP Panel Lock Enforcement:**
- When `lockedFields` contains a field name, that field is READ-ONLY
- IA can lock individual fields to prevent accidental changes
- Example: `["location", "subject"]` → Location and Subject fields are locked
- Empty array `[]` → All fields editable

**Production Workflow (from test line 198):**
```json
"lockedFields": []  // All fields editable
```

---

#### **Audit Timestamps**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `createdAt` | `string` (ISO8601) | ✅ | - | Clip metadata creation timestamp |
| `createdBy` | `string` | ✅ | - | Tool that created clip metadata (e.g., `"ingest-assistant"`) |
| `modifiedAt` | `string` (ISO8601) | ✅ | - | Last modification timestamp for this clip |
| `modifiedBy` | `string` | ✅ | - | Tool that last modified this clip (e.g., `"cep-panel"`) |
| `version` | `string` | ✅ | - | Tool version (semantic versioning, e.g., `"1.1.0"`) |

---

## 4. JSON LOCATION & LOOKUP ALGORITHM

### **4.1 Empirical Findings (ExtendScript Test)**

**Premiere Pro Path Test Results:**
```
Clip: EAV0TEST2.MOV
  Tape Name: N/A  (will be set by IA in production)
  Media Path: /test-videos-raw/EAV0TEST2.MOV
  Has Proxy: true
  Proxy Path: /test-videos-proxy/EAV0TEST2_Proxy.mov
```

**Key Learnings:**
1. `clip.getMediaPath()` → Always returns RAW path (even if proxy attached)
2. `clip.getProxyPath()` → Returns proxy path (if attached)
3. `clip.hasProxy()` → Detects proxy attachment (boolean)
4. JSON file co-located with PROXY files (NOT raw files)
5. Tape Name set by IA (immutable ID - test clips lacked it)

---

### **4.2 JSON Lookup Algorithm (CEP Panel)**

**Priority Order:**
1. **Check proxy folder FIRST** (if clip has proxy attached)
2. **Fallback to raw folder** (if no proxy or proxy check fails)

**ExtendScript Implementation:**
```javascript
// jsx/host.jsx: Locate .ingest-metadata.json for clip
function getMetadataFilePathForClip(clipItem) {
  var metadataPath = null;
  var clipId = getClipId(clipItem);

  // Strategy 1: Check proxy folder (PRIMARY)
  if (clipItem.hasProxy()) {
    var proxyPath = clipItem.getProxyPath();
    if (proxyPath) {
      var proxyFolder = proxyPath.substring(0, proxyPath.lastIndexOf('/'));
      metadataPath = proxyFolder + '/.ingest-metadata.json';

      var file = new File(metadataPath);
      if (file.exists) {
        return { success: true, path: metadataPath, clipId: clipId };
      }
    }
  }

  // Strategy 2: Fallback to raw folder
  var mediaPath = clipItem.getMediaPath();
  if (mediaPath) {
    var mediaFolder = mediaPath.substring(0, mediaPath.lastIndexOf('/'));
    metadataPath = mediaFolder + '/.ingest-metadata.json';

    var file = new File(metadataPath);
    if (file.exists) {
      return { success: true, path: metadataPath, clipId: clipId };
    }
  }

  return {
    success: false,
    error: 'Metadata file not found (checked proxy and raw folders)',
    clipId: clipId
  };
}
```

---

### **4.3 Clip ID Extraction Algorithm**

**Priority Order (Immutable ID Strategy):**
1. **Use PP Tape Name** (set by IA - immutable, survives relinking)
2. **Derive from proxy filename** (e.g., `EAV0TEST2_Proxy.mov` → `EAV0TEST2`)
3. **Use clip.name without extension** (fallback for offline clips)

**ExtendScript Implementation:**
```javascript
// jsx/host.jsx: Extract clip ID (immutable identifier)
function getClipId(clipItem) {
  // Strategy 1: Premiere Pro Tape Name (IMMUTABLE - set by IA)
  var tapeName = clipItem.getProjectMetadata();
  // Extract tapeName from XMP (xmpDM:tapeName field)
  // ... XMP parsing logic ...
  if (tapeName && tapeName.length > 0) {
    return tapeName; // e.g., "EAV0TEST2"
  }

  // Strategy 2: Derive from proxy filename
  if (clipItem.hasProxy()) {
    var proxyPath = clipItem.getProxyPath();
    if (proxyPath) {
      var proxyFilename = proxyPath.substring(proxyPath.lastIndexOf('/') + 1);
      // Remove "_Proxy.mov" suffix
      var clipId = proxyFilename.replace(/_Proxy\.[^.]+$/, '');
      return clipId; // e.g., "EAV0TEST2"
    }
  }

  // Strategy 3: Use clip name without extension (fallback)
  var clipName = clipItem.name;
  var clipId = clipName.replace(/\.[^.]+$/, ''); // Remove extension
  return clipId; // e.g., "EAV0TEST2"
}
```

---

## 5. FOLDER COMPLETION MECHANISM

### **5.1 _completed Flag Behavior**

**Root-Level Flag:**
```json
{
  "_schema": "2.0",
  "_completed": false,
  "EAV0TEST2": { ... },
  "EAV0TEST3": { ... }
}
```

**Production Workflow (from test line 3):**
- IA "COMPLETE" button sets `_completed: true` for entire shoot folder
- When `_completed: true`, ALL clips in folder considered finalized
- CEP Panel should warn users when editing clips from completed folders

**CEP Panel Warning Logic:**
```javascript
// CEP Panel: Check folder completion before editing
function checkFolderCompletion(metadataData) {
  if (metadataData._completed === true) {
    var proceed = confirm(
      "⚠️ FOLDER MARKED COMPLETE\n\n" +
      "This shoot folder has been marked as complete by Ingest Assistant.\n" +
      "Editing clips may require re-validation.\n\n" +
      "Do you want to proceed with editing?"
    );

    if (!proceed) {
      return { allowEdit: false, reason: 'User cancelled - folder marked complete' };
    }
  }
  return { allowEdit: true };
}
```

---

## 6. FIELD-LEVEL LOCK ENFORCEMENT

### **6.1 Lock Mechanism (lockedFields Array)**

**Example Locked Clip:**
```json
{
  "id": "EAV0TEST3",
  "shotName": "hallway-front-door-safety-chain-CU-#1",
  "location": "hallway",
  "subject": "front-door",
  "action": "safety-chain",
  "shotType": "CU",
  "keywords": ["door", "chain", "lock"],
  "lockedFields": ["location", "subject"]
}
```

**CEP Panel Lock Enforcement:**
```javascript
// CEP Panel: Disable locked fields in UI
function loadClipIntoForm(clip) {
  var lockedFields = clip.lockedFields || [];

  // Location field
  document.getElementById('location').disabled = (lockedFields.indexOf('location') !== -1);
  document.getElementById('location').value = clip.location || '';

  // Subject field
  document.getElementById('subject').disabled = (lockedFields.indexOf('subject') !== -1);
  document.getElementById('subject').value = clip.subject || '';

  // Action field
  document.getElementById('action').disabled = (lockedFields.indexOf('action') !== -1);
  document.getElementById('action').value = clip.action || '';

  // Shot Type field
  document.getElementById('shot-type').disabled = (lockedFields.indexOf('shotType') !== -1);
  document.getElementById('shot-type').value = clip.shotType || '';

  // Keywords field
  document.getElementById('keywords').disabled = (lockedFields.indexOf('keywords') !== -1);
  document.getElementById('keywords').value = (clip.keywords || []).join(', ');

  // Show lock indicators
  if (lockedFields.length > 0) {
    var lockMessage = "🔒 Locked fields: " + lockedFields.join(', ');
    document.getElementById('lock-status').innerText = lockMessage;
    document.getElementById('lock-status').style.display = 'block';
  } else {
    document.getElementById('lock-status').style.display = 'none';
  }
}
```

---

### **6.2 Validation Before Save**

```javascript
// CEP Panel: Validate locked fields before save
function validateLockedFields(clip, formData) {
  var lockedFields = clip.lockedFields || [];
  var violations = [];

  // Check if any locked field was modified
  if (lockedFields.indexOf('location') !== -1 && formData.location !== clip.location) {
    violations.push('location');
  }
  if (lockedFields.indexOf('subject') !== -1 && formData.subject !== clip.subject) {
    violations.push('subject');
  }
  if (lockedFields.indexOf('action') !== -1 && formData.action !== clip.action) {
    violations.push('action');
  }
  if (lockedFields.indexOf('shotType') !== -1 && formData.shotType !== clip.shotType) {
    violations.push('shotType');
  }

  if (violations.length > 0) {
    return {
      valid: false,
      error: 'Cannot modify locked fields: ' + violations.join(', ')
    };
  }

  return { valid: true };
}
```

---

## 7. CEP PANEL VALIDATION RULES

### **7.1 Read Validation (Loading `.ingest-metadata.json`)**

```javascript
// CEP Panel: Validate metadata schema on load
function validateMetadataSchema(data) {
  var errors = [];

  // 1. Check schema version
  if (!data._schema) {
    errors.push("Missing _schema field");
  }

  // 2. Check _completed flag
  if (typeof data._completed !== 'boolean') {
    errors.push("Missing or invalid _completed flag (must be boolean)");
  }

  // 3. Validate clip entries
  for (var clipId in data) {
    if (clipId.startsWith('_')) continue; // Skip metadata fields

    var clip = data[clipId];

    // Required identity fields
    if (!clip.id) errors.push(clipId + ": Missing id");
    if (clip.id !== clipId) errors.push(clipId + ": id mismatch");
    if (!clip.originalFilename) errors.push(clipId + ": Missing originalFilename");
    if (!clip.filePath) errors.push(clipId + ": Missing filePath");
    if (!clip.extension) errors.push(clipId + ": Missing extension");
    if (!clip.fileType) errors.push(clipId + ": Missing fileType");

    // Required metadata fields
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
      errors.push(clipId + ": lockedFields must be ARRAY");
    }

    // Structured name components
    if (!clip.location) errors.push(clipId + ": Missing location");
    if (!clip.subject) errors.push(clipId + ": Missing subject");
    if (!clip.action) errors.push(clipId + ": Missing action");
    if (!clip.shotType) errors.push(clipId + ": Missing shotType");
  }

  return errors.length > 0 ? errors : null;
}
```

---

### **7.2 Write Validation (Saving to `.ingest-metadata.json`)**

```javascript
// CEP Panel: Validate before writing
function validateClipMetadata(clip, formData) {
  var errors = [];

  // 1. Check folder completion warning
  var folderCheck = checkFolderCompletion(clip._metadata);
  if (!folderCheck.allowEdit) {
    errors.push(folderCheck.reason);
    return errors;
  }

  // 2. Check field-level locks
  var lockCheck = validateLockedFields(clip, formData);
  if (!lockCheck.valid) {
    errors.push(lockCheck.error);
    return errors;
  }

  // 3. Required fields validation
  if (!formData.location || formData.location.trim() === '') {
    errors.push("Location is required");
  }
  if (!formData.subject || formData.subject.trim() === '') {
    errors.push("Subject is required");
  }
  if (!formData.action || formData.action.trim() === '') {
    errors.push("Action is required");
  }
  if (!formData.shotType || formData.shotType.trim() === '') {
    errors.push("Shot Type is required");
  }

  // 4. Shot type controlled vocabulary
  var validShotTypes = ['ESTAB', 'WS', 'MS', 'MID', 'MCU', 'CU', 'ECU', 'OTS', 'INSERT'];
  if (validShotTypes.indexOf(formData.shotType) === -1) {
    errors.push("Invalid shot type: " + formData.shotType);
  }

  return errors.length > 0 ? errors : null;
}
```

---

## 8. XMP MAPPING (CEP Panel → Premiere Pro)

### **8.1 XMP Field Mapping**

| JSON Field | XMP Field | Format | Example |
|------------|-----------|--------|---------|
| `shotName` | `xmpDM:shotName` | String (with #N) | `"kitchen-oven-cleaning-MID-#3"` |
| `keywords` | `dc:description` | Comma-separated string | `"door, chain, lock"` |
| `location`, `subject`, `action`, `shotType` | `xmpDM:LogComment` | Key=value pairs | `"location=kitchen\nsubject=oven\naction=cleaning\nshotType=MID"` |

**CRITICAL NOTE:**
Current CEP implementation may use `xmpDM:logComment` (lowercase 'c') instead of `xmpDM:LogComment` (capital 'C'). Verify during XMPScript SDK migration.

---

### **8.2 XMP Write Pattern (ExtendScript)**

```javascript
// jsx/host.jsx: Write R1.1 metadata to XMP
function updateClipMetadataR11(clipItem, metadata) {
  var xmpString = clipItem.getProjectMetadata();

  // 1. Write shotName to xmpDM:shotName (includes #N)
  xmpString = updateXMPField(xmpString, 'xmpDM', 'shotName', metadata.shotName);

  // 2. Write keywords array to dc:description (comma-separated string)
  var keywordsString = metadata.keywords.join(', ');
  xmpString = updateXMPField(xmpString, 'dc', 'description', keywordsString);

  // 3. Write structured fields to xmpDM:LogComment (key=value pairs)
  var logComment =
    "location=" + metadata.location + "\n" +
    "subject=" + metadata.subject + "\n" +
    "action=" + metadata.action + "\n" +
    "shotType=" + metadata.shotType;
  xmpString = updateXMPField(xmpString, 'xmpDM', 'LogComment', logComment);

  // 4. Set updated XMP
  clipItem.setProjectMetadata(xmpString, ['xmpDM:shotName', 'dc:description', 'xmpDM:LogComment']);

  return { success: true };
}
```

---

## 9. SCHEMA MIGRATION (Old → R1.1)

### **9.1 Breaking Changes**

| Old Field | R1.1 Field | Migration Action |
|-----------|------------|------------------|
| `mainName` | `shotName` | Rename field |
| `description` (string) | `keywords` (array) | Split string by comma, convert to array |
| `locked` (boolean) | `lockedFields` (array) | Convert: `locked: true` → `lockedFields: ["location", "subject", "action", "shotType"]` |
| (missing) | `_completed` | Add field (default: `false`) |
| `shotName` (without #N) | `shotName` (with #N) | Append `"-#" + shotNumber` |

---

### **9.2 Migration Script**

```javascript
// Migrate old schema → R1.1
function migrateToR11(oldData) {
  var newData = {
    _schema: "2.0",
    _completed: false  // Default: folder not marked complete
  };

  for (var clipId in oldData) {
    if (clipId.startsWith('_')) {
      // Preserve root-level metadata fields
      newData[clipId] = oldData[clipId];
      continue;
    }

    var oldClip = oldData[clipId];
    var newClip = {
      // Identity fields (unchanged)
      id: oldClip.id,
      originalFilename: oldClip.originalFilename,
      currentFilename: oldClip.currentFilename || oldClip.originalFilename,
      filePath: oldClip.filePath,
      extension: oldClip.extension,
      fileType: oldClip.fileType,
      creationTimestamp: oldClip.creationTimestamp || oldClip.createdAt,
      cameraId: oldClip.cameraId || oldClip.id,

      // MIGRATION: mainName → shotName (add #N if missing)
      shotNumber: oldClip.shotNumber || 0,
      shotName: oldClip.mainName || oldClip.shotName || "",

      // MIGRATION: description string → keywords array
      keywords: [],

      // Structured fields (unchanged)
      location: oldClip.location || "",
      subject: oldClip.subject || "",
      action: oldClip.action || "",
      shotType: oldClip.shotType || "",

      // Processing metadata
      processedByAI: oldClip.processedByAI || false,

      // MIGRATION: locked boolean → lockedFields array
      lockedFields: [],

      // Audit timestamps
      createdAt: oldClip.createdAt,
      createdBy: oldClip.createdBy || "ingest-assistant",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "migration-script",
      version: oldClip.version || "1.1.0"
    };

    // Handle keywords migration
    if (oldClip.description && typeof oldClip.description === 'string') {
      // Split comma-separated string into array
      newClip.keywords = oldClip.description.split(',').map(function(k) {
        return k.trim();
      }).filter(function(k) {
        return k.length > 0;
      });
    } else if (Array.isArray(oldClip.keywords)) {
      newClip.keywords = oldClip.keywords;
    }

    // Handle locked field migration
    if (oldClip.locked === true) {
      // If old clip was locked, lock all editable fields
      newClip.lockedFields = ["location", "subject", "action", "shotType", "keywords"];
    }

    // Ensure shotName includes #N format
    if (newClip.shotNumber > 0 && newClip.shotName.indexOf('#') === -1) {
      newClip.shotName = newClip.shotName + "-#" + newClip.shotNumber;
    }

    newData[clipId] = newClip;
  }

  return newData;
}
```

---

## 10. VALIDATION CHECKLIST

### **CEP Panel Implementation Requirements**

**Schema Compliance:**
- [ ] Use `shotName` field (NOT `mainName`)
- [ ] Use `keywords` ARRAY (NOT `description` string)
- [ ] Support `shotNumber` as separate field AND in shotName format
- [ ] Implement field-level lock (`lockedFields` array)
- [ ] Support folder completion flag (`_completed`)

**JSON Location:**
- [ ] Check proxy folder FIRST (if clip has proxy)
- [ ] Fallback to raw folder (if no proxy or not found)
- [ ] Use `clip.getProxyPath()` for proxy folder detection
- [ ] Use `clip.getMediaPath()` for raw folder fallback

**Clip ID Extraction:**
- [ ] Use PP Tape Name (immutable ID - set by IA)
- [ ] Derive from proxy filename (`EAV0TEST2_Proxy.mov` → `EAV0TEST2`)
- [ ] Fallback to clip.name without extension

**Lock Enforcement:**
- [ ] Disable fields listed in `lockedFields` array
- [ ] Show lock indicator (which fields are locked)
- [ ] Prevent saving changes to locked fields
- [ ] Warn when editing clips from completed folders (`_completed: true`)

**XMP Integration:**
- [ ] Write `shotName` (with #N) to `xmpDM:shotName`
- [ ] Write `keywords` array to `dc:description` (comma-separated)
- [ ] Write structured fields to `xmpDM:LogComment` (NOT `logComment`)
- [ ] Verify XMP persistence (reload clip should show same data)

**Audit Trail:**
- [ ] Update `modifiedAt` timestamp on save
- [ ] Update `modifiedBy` to `"cep-panel"`
- [ ] Preserve `createdAt`, `createdBy` from IA

---

## 11. TEST FIXTURE EXAMPLE

**See:** `.coord/test-fixtures/.ingest-metadata-r1.1.json`

This production-validated test fixture includes:
- ✅ Correct field names (`shotName`, `keywords`)
- ✅ shotNumber in shotName format (`"kitchen-oven-cleaning-MID-#3"`)
- ✅ Field-level lock example (`lockedFields: ["location", "subject"]`)
- ✅ Folder completion flag (`_completed: false`)
- ✅ Real test data from Premiere Pro integration test

---

## 12. REFERENCES

**Validation Sources:**
- ✅ User confirmation (2025-11-18): Field names, formats, lock mechanism
- ✅ Production test JSON: 3 clips with actual IA output
- ✅ ExtendScript path analysis: `clip.getProxyPath()` validation
- ✅ Premiere Pro integration test: Proxy attachment verification

**Related Documentation:**
- `.coord/docs/000001-DOC-METADATA-STRATEGY-SHARED.md` (XMP field mapping)
- `CLAUDE.md` (CEP Panel operational guide)
- `.coord/test-fixtures/.ingest-metadata-r1.1.json` (Production test fixture)

**Schema Version:** R1.1
**Status:** PRODUCTION-VALIDATED (Empirical Test Evidence)
**Next Review:** After IA schema updates or CEP Panel implementation

---

**END OF R1.1 AUTHORITATIVE SCHEMA DOCUMENTATION**
