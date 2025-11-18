# R1.1 Schema - Quick Reference Guide

**Purpose:** Fast lookup for developers implementing CEP Panel R1.1 support
**Last Updated:** 2025-11-18

---

## CRITICAL FIELD NAMES (USER-CONFIRMED)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `shotName` | `string` | `"kitchen-oven-cleaning-MID-#3"` | **NOT** `mainName` (old name) |
| `keywords` | `array<string>` | `["door", "chain", "lock"]` | **NOT** `description` string |
| `lockedFields` | `array<string>` | `["location", "subject"]` | **NOT** `locked` boolean |
| `_completed` | `boolean` | `false` | Root-level flag (folder completion) |
| `shotNumber` | `number` | `3` | ALSO included in `shotName` string |

---

## SHOT NAME FORMAT

```
shotName = "{location}-{subject}-{action}-{shotType}-#{shotNumber}"

Example:
  location: "kitchen"
  subject: "oven"
  action: "cleaning"
  shotType: "MID"
  shotNumber: 3

  → shotName: "kitchen-oven-cleaning-MID-#3"
```

**Key Point:** shotNumber appears TWICE:
1. As separate field: `"shotNumber": 3`
2. In shotName string: `"shotName": "...-#3"`

---

## KEYWORDS HANDLING

### **JSON → UI Display**
```javascript
// Array to comma-separated string
var keywords = ["door", "chain", "lock"];
var displayString = keywords.join(', ');
// Result: "door, chain, lock"
```

### **UI Input → JSON Storage**
```javascript
// Comma-separated string to array
var userInput = "door, chain, lock";
var keywordsArray = userInput.split(',').map(function(k) {
  return k.trim();
}).filter(function(k) {
  return k.length > 0;
});
// Result: ["door", "chain", "lock"]
```

### **JSON → XMP Write**
```javascript
// Array to comma-separated string for XMP
var keywords = ["door", "chain", "lock"];
var xmpString = keywords.join(', ');
// Write to: dc:description = "door, chain, lock"
```

---

## FIELD-LEVEL LOCKS

### **Lock Enforcement (UI)**
```javascript
var lockedFields = ["location", "subject"]; // From JSON

// Disable locked fields
document.getElementById('location').disabled = (lockedFields.indexOf('location') !== -1);
document.getElementById('subject').disabled = (lockedFields.indexOf('subject') !== -1);
document.getElementById('action').disabled = (lockedFields.indexOf('action') !== -1);
// etc.
```

### **Save Validation**
```javascript
// Prevent saving changes to locked fields
if (lockedFields.indexOf('location') !== -1 && formData.location !== originalClip.location) {
  alert('Cannot modify locked field: location');
  return false;
}
```

---

## FOLDER COMPLETION FLAG

### **Check on Load**
```javascript
// Root-level flag (NOT clip-level)
if (metadataData._completed === true) {
  var proceed = confirm('⚠️ Folder marked complete. Proceed with editing?');
  if (!proceed) {
    disableAllFormFields();
  }
}
```

---

## JSON LOCATION (PROXY FOLDER PRIORITY)

### **ExtendScript Lookup Algorithm**
```javascript
// STAGE 1: Check proxy folder (PRIMARY)
if (clipItem.hasProxy()) {
  var proxyPath = clipItem.getProxyPath();
  var proxyFolder = proxyPath.substring(0, proxyPath.lastIndexOf('/'));
  var metadataPath = proxyFolder + '/.ingest-metadata.json';

  if (fileExists(metadataPath)) {
    return metadataPath; // Found in proxy folder
  }
}

// STAGE 2: Fallback to raw folder
var mediaPath = clipItem.getMediaPath();
var mediaFolder = mediaPath.substring(0, mediaPath.lastIndexOf('/'));
var metadataPath = mediaFolder + '/.ingest-metadata.json';

if (fileExists(metadataPath)) {
  return metadataPath; // Found in raw folder
}

return null; // Not found
```

---

## CLIP ID EXTRACTION (IMMUTABLE ID)

### **Priority Order**
```javascript
// 1. Premiere Pro Tape Name (BEST - immutable)
var tapeName = extractFromXMP(clipItem.getProjectMetadata());
if (tapeName) return tapeName; // e.g., "EAV0TEST2"

// 2. Proxy filename (GOOD - reliable)
if (clipItem.hasProxy()) {
  var proxyPath = clipItem.getProxyPath();
  // "EAV0TEST2_Proxy.mov" → "EAV0TEST2"
  var clipId = proxyPath.match(/([^\/]+)_Proxy\./)[1];
  return clipId;
}

// 3. clip.name (FALLBACK - user may rename)
var clipName = clipItem.name; // "EAV0TEST2.MOV"
return clipName.replace(/\.[^.]+$/, ''); // "EAV0TEST2"
```

---

## VALIDATION RULES

### **Required Fields**
```javascript
var requiredFields = [
  // Identity
  'id', 'originalFilename', 'currentFilename', 'filePath',
  'extension', 'fileType', 'creationTimestamp', 'cameraId',

  // Core metadata
  'shotNumber', 'shotName', 'keywords',

  // Structured fields
  'location', 'subject', 'action', 'shotType',

  // Processing
  'processedByAI', 'lockedFields',

  // Audit
  'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy', 'version'
];
```

### **Type Validation**
```javascript
// String fields
if (typeof clip.shotName !== 'string') throw error;

// Number fields
if (typeof clip.shotNumber !== 'number') throw error;

// Array fields
if (!Array.isArray(clip.keywords)) throw error;
if (!Array.isArray(clip.lockedFields)) throw error;

// Boolean fields
if (typeof clip.processedByAI !== 'boolean') throw error;
```

### **Shot Type Validation**
```javascript
var validShotTypes = ['ESTAB', 'WS', 'MS', 'MID', 'MCU', 'CU', 'ECU', 'OTS', 'INSERT'];
if (validShotTypes.indexOf(clip.shotType) === -1) throw error;
```

---

## MINIMAL VALID R1.1 JSON

```json
{
  "_schema": "2.0",
  "_completed": false,
  "EAV0TEST1": {
    "id": "EAV0TEST1",
    "originalFilename": "EAV0TEST1.MOV",
    "currentFilename": "EAV0TEST1.MOV",
    "filePath": "/path/to/EAV0TEST1.MOV",
    "extension": ".MOV",
    "fileType": "video",
    "creationTimestamp": "2024-09-26T10:25:00Z",
    "cameraId": "EAV0TEST1",

    "shotNumber": 1,
    "shotName": "kitchen-oven-cleaning-ESTAB-#1",
    "keywords": [],

    "location": "kitchen",
    "subject": "oven",
    "action": "cleaning",
    "shotType": "ESTAB",

    "processedByAI": true,
    "lockedFields": [],

    "createdAt": "2025-11-18T02:59:32Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T02:59:32Z",
    "modifiedBy": "ingest-assistant",
    "version": "1.1.0"
  }
}
```

---

## COMMON MISTAKES TO AVOID

| ❌ WRONG | ✅ CORRECT |
|---------|----------|
| `mainName` field | `shotName` field |
| `description` string | `keywords` array |
| `locked` boolean | `lockedFields` array |
| `shotName: "kitchen-oven-cleaning-MID"` (no #N) | `shotName: "kitchen-oven-cleaning-MID-#3"` (with #N) |
| `keywords: "door, chain, lock"` (string) | `keywords: ["door", "chain", "lock"]` (array) |
| `lockedFields: true` (boolean) | `lockedFields: ["location", "subject"]` (array) |
| JSON in raw folder ONLY | JSON in proxy folder PRIMARY, raw FALLBACK |

---

## XMP FIELD MAPPING

| JSON Field | XMP Field | Format |
|------------|-----------|--------|
| `shotName` | `xmpDM:shotName` | String (with #N) |
| `keywords` | `dc:description` | Comma-separated string |
| `location`, `subject`, `action`, `shotType` | `xmpDM:LogComment` | Key=value pairs (newline-separated) |

**Example XMP Write:**
```javascript
// shotName
xmpString = updateXMPField(xmpString, 'xmpDM', 'shotName', 'kitchen-oven-cleaning-MID-#3');

// keywords
var keywordsString = clip.keywords.join(', ');
xmpString = updateXMPField(xmpString, 'dc', 'description', keywordsString);

// structured fields
var logComment = 'location=' + clip.location + '\n' +
                 'subject=' + clip.subject + '\n' +
                 'action=' + clip.action + '\n' +
                 'shotType=' + clip.shotType;
xmpString = updateXMPField(xmpString, 'xmpDM', 'LogComment', logComment);
```

---

## TEST FIXTURE LOCATION

**File:** `.coord/test-fixtures/.ingest-metadata-r1.1.json`

**Contains:**
- 3 production-validated test clips
- Empty keywords example (`keywords: []`)
- Populated keywords example (`keywords: ["door", "chain", "lock"]`)
- Field-level lock example (`lockedFields: ["location", "subject"]`)
- shotName with `#N` format

---

## REFERENCES

**Full Documentation:**
- `005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md` - Complete schema spec
- `008-DOC-CEP-R1-1-IMPLEMENTATION-GUIDE.md` - Implementation examples
- `010-DOC-SCHEMA-MIGRATION-OLD-TO-R1-1.md` - Migration guide

**Test Evidence:**
- Premiere Pro integration test (2025-11-18)
- User confirmation (field names, formats, lock mechanism)
- ExtendScript path validation (`clip.getProxyPath()`)

---

**END OF QUICK REFERENCE**
