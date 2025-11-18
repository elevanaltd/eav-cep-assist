# R1.1 Schema - Quick Reference Card

**Version:** R1.1 (Authoritative)
**Last Updated:** 2025-11-18

---

## CRITICAL FIELD NAMES (Don't Get These Wrong!)

| ❌ WRONG (R1.0 Demo) | ✅ CORRECT (R1.1) | Type | Example |
|---------------------|-------------------|------|---------|
| `mainName` | **`shotName`** | `string` | `"kitchen-oven-cleaning-ESTAB"` |
| `keywords` (array) | **`description`** | `string` | `"stainless-steel, gas-range"` |
| (missing) | **`shotNumber`** | `number` | `25` |
| (missing) | **`locked`** | `boolean` | `false` |

---

## COMPLETE FIELD LIST (Clip Object)

### **Identity Fields** (Required)
```javascript
id:               string    // "EA001932" (matches object key)
originalFilename: string    // "EA001932.MOV"
currentFilename:  string    // "EA001932_proxy.mov"
filePath:         string    // "/LucidLink/EAV036-proxies/..."
extension:        string    // ".mov"
fileType:         string    // "video" | "image"
```

### **Core Metadata** (Required)
```javascript
shotName:         string    // "kitchen-oven-cleaning-ESTAB"
shotNumber:       number    // 25
description:      string    // "stainless-steel, gas-range" (comma-separated)
```

### **Structured Name Components** (Required)
```javascript
location:         string    // "kitchen"
subject:          string    // "oven"
action:           string    // "cleaning"
shotType:         string    // "ESTAB" | "WS" | "MS" | "MCU" | "CU" | "ECU" | "OTS" | "INSERT"
```

### **Lock Mechanism** (Required)
```javascript
locked:           boolean   // false (editable) | true (read-only)
lockedBy:         string|null  // "editor-name" | null
lockedAt:         string|null  // "2025-11-18T14:45:00.000Z" | null
```

### **Processing & Audit** (Required)
```javascript
processedByAI:    boolean   // true (IA generated) | false (manual)
createdAt:        string    // "2025-11-18T10:00:00.000Z" (ISO8601)
createdBy:        string    // "ingest-assistant"
modifiedAt:       string    // "2025-11-18T14:30:00.000Z" (ISO8601)
modifiedBy:       string    // "cep-panel"
```

---

## FILE LOCATION (GET THIS RIGHT!)

**✅ CORRECT (Proxy Folder ONLY):**
```
/LucidLink/EAV036-proxies/shoot1-20251103/.ingest-metadata.json
```

**❌ WRONG (RAW Folder - DO NOT USE):**
```
/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/.ingest-metadata.json
```

---

## LOCK ENFORCEMENT (MANDATORY)

### **Before Editing Clip**
```javascript
if (clip.locked === true) {
  alert('Locked by: ' + clip.lockedBy + ' at ' + clip.lockedAt);
  return; // DO NOT ALLOW EDIT
}
```

### **UI State for Locked Clip**
```javascript
// Disable all form fields
document.getElementById('location').disabled = true;
document.getElementById('subject').disabled = true;
document.getElementById('action').disabled = true;
document.getElementById('shot-type').disabled = true;
document.getElementById('description').disabled = true;

// Disable Apply button
document.getElementById('apply-metadata').disabled = true;

// Show lock indicator
document.getElementById('lock-status').innerText = '🔒 LOCKED by ' + clip.lockedBy;
document.getElementById('lock-status').style.display = 'block';
```

---

## SCHEMA VERSION CHECK

```javascript
// Always check schema version first
if (data._schema !== 'R1.1') {
  throw new Error('Unsupported schema version: ' + data._schema);
}
```

---

## GENERATED NAME FORMULA

```javascript
shotName = location + '-' + subject + '-' + action + '-' + shotType;
// Example: "kitchen-oven-cleaning-ESTAB"
```

**Note:** `shotNumber` is SEPARATE field (NOT appended to `shotName`)

---

## SHOT TYPE VOCABULARY (Controlled)

Valid shot types (case-sensitive):
```javascript
['ESTAB', 'WS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'INSERT']
```

**Validation:**
```javascript
var validShotTypes = ['ESTAB', 'WS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'INSERT'];
if (validShotTypes.indexOf(clip.shotType) === -1) {
  throw new Error('Invalid shot type: ' + clip.shotType);
}
```

---

## XMP MAPPING (CEP → Premiere Pro)

| JSON Field | XMP Field | Example |
|------------|-----------|---------|
| `shotName` | `xmpDM:shotName` | `"kitchen-oven-cleaning-ESTAB"` |
| `description` | `dc:description` | `"stainless-steel, gas-range"` |
| `location`, `subject`, `action`, `shotType` | `xmpDM:LogComment` | `"location=kitchen\nsubject=oven\n..."` |

**⚠️ BUG TO FIX:** Current implementation uses `xmpDM:logComment` (lowercase 'c') instead of `xmpDM:LogComment` (capital 'C').

---

## COMMON ERRORS & FIXES

### **Error: "Missing shotName field"**
**Cause:** Using old `mainName` field
**Fix:** Use `clip.shotName` (NOT `clip.mainName`)

### **Error: "description must be string"**
**Cause:** Using old `keywords[]` array
**Fix:** Use `clip.description` as STRING (comma-separated)

### **Error: "Cannot edit locked clip"**
**Cause:** `clip.locked === true` (IA "COMPLETE" button pressed)
**Fix:** Respect lock state - DO NOT allow edits

### **Error: "Metadata file not found"**
**Cause:** Looking in RAW folder instead of proxy folder
**Fix:** Use LucidLink proxy folder path: `/LucidLink/{project}-proxies/{shoot}/.ingest-metadata.json`

---

## REQUIRED FIELD VALIDATION

```javascript
var requiredFields = [
  // Identity
  'id', 'originalFilename', 'currentFilename', 'filePath', 'extension', 'fileType',
  // Core metadata
  'shotName', 'shotNumber', 'description',
  // Structured components
  'location', 'subject', 'action', 'shotType',
  // Lock mechanism
  'locked',
  // Audit
  'processedByAI', 'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'
];

for (var i = 0; i < requiredFields.length; i++) {
  if (clip[requiredFields[i]] === undefined) {
    throw new Error('Missing required field: ' + requiredFields[i]);
  }
}
```

---

## TYPE VALIDATION

```javascript
// String fields
if (typeof clip.shotName !== 'string') throw new Error('shotName must be string');
if (typeof clip.description !== 'string') throw new Error('description must be string');
if (typeof clip.location !== 'string') throw new Error('location must be string');
if (typeof clip.subject !== 'string') throw new Error('subject must be string');
if (typeof clip.action !== 'string') throw new Error('action must be string');
if (typeof clip.shotType !== 'string') throw new Error('shotType must be string');

// Number fields
if (typeof clip.shotNumber !== 'number') throw new Error('shotNumber must be number');

// Boolean fields
if (typeof clip.locked !== 'boolean') throw new Error('locked must be boolean');
if (typeof clip.processedByAI !== 'boolean') throw new Error('processedByAI must be boolean');
```

---

## READING METADATA (ExtendScript)

```javascript
// Get metadata file path from clip path
var clipPath = '/LucidLink/EAV036-proxies/shoot1-20251103/EA001932_proxy.mov';
var lastSlash = clipPath.lastIndexOf('/');
var directoryPath = clipPath.substring(0, lastSlash);
var metadataPath = directoryPath + '/.ingest-metadata.json';

// Read file
var file = new File(metadataPath);
if (!file.exists) {
  throw new Error('Metadata file not found: ' + metadataPath);
}
file.open('r');
var data = JSON.parse(file.read());
file.close();

// Validate schema
if (data._schema !== 'R1.1') {
  throw new Error('Unsupported schema version: ' + data._schema);
}

// Access clip metadata
var clip = data['EA001932'];
if (!clip) {
  throw new Error('Clip not found: EA001932');
}

// Check lock state
if (clip.locked === true) {
  // DO NOT ALLOW EDITS
}
```

---

## WRITING METADATA (ExtendScript)

```javascript
// Check lock state BEFORE editing
if (clip.locked === true) {
  throw new Error('Cannot edit locked clip (locked by: ' + clip.lockedBy + ')');
}

// Update clip metadata
clip.location = 'kitchen';
clip.subject = 'oven';
clip.action = 'cleaning';
clip.shotType = 'ESTAB';
clip.shotName = clip.location + '-' + clip.subject + '-' + clip.action + '-' + clip.shotType;
clip.description = 'stainless-steel, gas-range';

// Update audit trail (MANDATORY)
clip.modifiedAt = new Date().toISOString();
clip.modifiedBy = 'cep-panel';

// Update file-level metadata (MANDATORY)
data._metadata.modifiedAt = new Date().toISOString();
data._metadata.modifiedBy = 'cep-panel';

// Write back to file
var file = new File(metadataPath);
file.open('w');
file.write(JSON.stringify(data, null, 2));
file.close();
```

---

## MIGRATION SCRIPT (R1.0 → R1.1)

```javascript
// Quick migration for single clip
function migrateClip(oldClip) {
  return {
    // Identity (unchanged)
    id: oldClip.id,
    originalFilename: oldClip.originalFilename,
    currentFilename: oldClip.currentFilename,
    filePath: oldClip.filePath,
    extension: oldClip.extension,
    fileType: oldClip.fileType,

    // BREAKING CHANGE: mainName → shotName
    shotName: oldClip.shotName || oldClip.mainName || '',

    // NEW FIELD: shotNumber
    shotNumber: oldClip.shotNumber || 0,

    // BREAKING CHANGE: keywords[] → description (string)
    description: oldClip.description ||
                 (Array.isArray(oldClip.keywords) ? oldClip.keywords.join(', ') : ''),

    // Structured fields (unchanged)
    location: oldClip.location || '',
    subject: oldClip.subject || '',
    action: oldClip.action || '',
    shotType: oldClip.shotType || '',

    // Processing (unchanged)
    processedByAI: oldClip.processedByAI || false,

    // NEW FIELDS: Lock mechanism
    locked: oldClip.locked || false,
    lockedBy: oldClip.lockedBy || null,
    lockedAt: oldClip.lockedAt || null,

    // Audit (update timestamps)
    createdAt: oldClip.createdAt || new Date().toISOString(),
    createdBy: oldClip.createdBy || 'unknown',
    modifiedAt: new Date().toISOString(),
    modifiedBy: 'migration-script'
  };
}
```

---

## EXAMPLE METADATA FILE (R1.1)

```json
{
  "_schema": "R1.1",
  "_metadata": {
    "projectCode": "EAV036",
    "shootFolder": "shoot1-20251103",
    "createdAt": "2025-11-18T10:00:00.000Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T14:30:00.000Z",
    "modifiedBy": "cep-panel",
    "version": "1.2.0"
  },
  "EA001932": {
    "id": "EA001932",
    "originalFilename": "EA001932.MOV",
    "currentFilename": "EA001932_proxy.mov",
    "filePath": "/LucidLink/EAV036-proxies/shoot1-20251103/EA001932_proxy.mov",
    "extension": ".mov",
    "fileType": "video",
    "shotName": "hallway-front-door-safety-chain-CU",
    "shotNumber": 25,
    "description": "door, chain, lock, security",
    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",
    "shotType": "CU",
    "processedByAI": true,
    "locked": false,
    "lockedBy": null,
    "lockedAt": null,
    "createdAt": "2025-11-18T10:00:00.000Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T14:30:00.000Z",
    "modifiedBy": "cep-panel"
  }
}
```

---

## CHEAT SHEET: OLD → NEW

| Task | R1.0 (WRONG) | R1.1 (CORRECT) |
|------|--------------|----------------|
| Get main name | `clip.mainName` | `clip.shotName` |
| Get keywords | `clip.keywords.join(', ')` | `clip.description` |
| Set keywords | `clip.keywords = ['a', 'b']` | `clip.description = 'a, b'` |
| Check if locked | (not available) | `if (clip.locked === true)` |
| Get shot number | (not available) | `clip.shotNumber` |
| Metadata location | RAW folder | Proxy folder (LucidLink) |

---

## VALIDATION CHECKLIST (Before Production)

- [ ] Using `shotName` field (NOT `mainName`)
- [ ] Using `description` STRING (NOT `keywords[]` array)
- [ ] Supporting `shotNumber` (read-only display)
- [ ] Checking `locked` state before edits
- [ ] Disabling form when `locked === true`
- [ ] Showing lock indicator (who, when)
- [ ] Reading metadata from proxy folder (LucidLink)
- [ ] Validating schema version (`_schema === "R1.1"`)
- [ ] Validating shot type against controlled vocabulary
- [ ] Updating `modifiedAt`, `modifiedBy` on save

---

## COMPLETE DOCUMENTATION

For full details, see:
- **`005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md`** - Complete schema (22KB)
- **`006-DOC-SCHEMA-R1-1-EXAMPLE.md`** - Examples & validation (6.4KB)
- **`007-DOC-SCHEMA-MIGRATION-R1-0-TO-R1-1.md`** - Migration guide (16KB)
- **`008-DOC-SCHEMA-R1-1-DELIVERY-SUMMARY.md`** - Delivery summary

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-11-18
**Print this card and keep it visible during development!**
