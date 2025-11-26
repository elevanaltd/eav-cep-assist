# R1.1 Schema - JSON Example

**Purpose:** Reference implementation of R1.1 metadata schema for CEP Panel + Ingest Assistant

**Schema Version:** R1.1
**Last Updated:** 2025-11-18

---

## Complete Example: `.ingest-metadata.json`

**File Location:** `/LucidLink/EAV036-proxies/shoot1-20251103/.ingest-metadata.json`

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
  },
  "EA001933": {
    "id": "EA001933",
    "originalFilename": "EA001933.MOV",
    "currentFilename": "EA001933_proxy.mov",
    "filePath": "/LucidLink/EAV036-proxies/shoot1-20251103/EA001933_proxy.mov",
    "extension": ".mov",
    "fileType": "video",

    "shotName": "kitchen-oven-cleaning-ESTAB",
    "shotNumber": 26,
    "description": "stainless-steel, gas-range, appliance",

    "location": "kitchen",
    "subject": "oven",
    "action": "cleaning",
    "shotType": "ESTAB",

    "processedByAI": true,
    "locked": true,
    "lockedBy": "editor-name",
    "lockedAt": "2025-11-18T14:45:00.000Z",

    "createdAt": "2025-11-18T10:00:00.000Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-18T14:45:00.000Z",
    "modifiedBy": "ingest-assistant"
  }
}
```

---

## Field Notes

### **Critical Differences from R1.0 (Demo)**

1. **`shotName`** (NOT `mainName`) - User-confirmed actual IA field
2. **`shotNumber`** - Separate field (IA-generated), NOT appended to `shotName`
3. **`description`** - STRING (NOT `keywords[]` array) - "more likely to survive offline work"
4. **Lock fields** - `locked`, `lockedBy`, `lockedAt` (partial implementation via IA "COMPLETE" button)

### **Lock State Examples**

**Unlocked Clip (Editable):**
```json
"locked": false,
"lockedBy": null,
"lockedAt": null
```

**Locked Clip (Read-Only):**
```json
"locked": true,
"lockedBy": "editor-name",
"lockedAt": "2025-11-18T14:45:00.000Z"
```

### **Generated Name Formula**

```javascript
shotName = location + "-" + subject + "-" + action + "-" + shotType
// Example: "kitchen-oven-cleaning-ESTAB"
```

**Note:** `shotNumber` is SEPARATE field - NOT part of `shotName` string.

---

## CEP Panel Usage

### **Reading Metadata**

```javascript
// Load metadata file
var metadataPath = '/LucidLink/EAV036-proxies/shoot1-20251103/.ingest-metadata.json';
var file = new File(metadataPath);
file.open('r');
var data = JSON.parse(file.read());
file.close();

// Access clip metadata
var clip = data['EA001932'];
console.log(clip.shotName);      // "hallway-front-door-safety-chain-CU"
console.log(clip.shotNumber);    // 25
console.log(clip.description);   // "door, chain, lock, security"
console.log(clip.locked);        // false
```

### **Writing Metadata**

```javascript
// Check lock state before editing
if (clip.locked === true) {
  alert('Cannot edit locked clip (locked by: ' + clip.lockedBy + ')');
  return;
}

// Update clip metadata
clip.location = 'kitchen';
clip.subject = 'oven';
clip.action = 'cleaning';
clip.shotType = 'ESTAB';
clip.shotName = clip.location + '-' + clip.subject + '-' + clip.action + '-' + clip.shotType;
clip.description = 'stainless-steel, gas-range';

// Update audit trail
clip.modifiedAt = new Date().toISOString();
clip.modifiedBy = 'cep-panel';

// Update file-level metadata
data._metadata.modifiedAt = new Date().toISOString();
data._metadata.modifiedBy = 'cep-panel';

// Write back to file
var file = new File(metadataPath);
file.open('w');
file.write(JSON.stringify(data, null, 2));
file.close();
```

---

## Validation Rules

### **Schema Version Check**

```javascript
if (data._schema !== 'R1.1') {
  throw new Error('Unsupported schema version: ' + data._schema);
}
```

### **Required Fields**

```javascript
var requiredFields = [
  'id', 'originalFilename', 'currentFilename', 'filePath',
  'extension', 'fileType', 'shotName', 'shotNumber', 'description',
  'location', 'subject', 'action', 'shotType',
  'processedByAI', 'locked',
  'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'
];

for (var i = 0; i < requiredFields.length; i++) {
  if (clip[requiredFields[i]] === undefined) {
    throw new Error('Missing required field: ' + requiredFields[i]);
  }
}
```

### **Type Validation**

```javascript
// String fields
if (typeof clip.shotName !== 'string') {
  throw new Error('shotName must be string');
}
if (typeof clip.description !== 'string') {
  throw new Error('description must be string (NOT array)');
}

// Number fields
if (typeof clip.shotNumber !== 'number') {
  throw new Error('shotNumber must be number');
}

// Boolean fields
if (typeof clip.locked !== 'boolean') {
  throw new Error('locked must be boolean');
}
```

### **Shot Type Validation**

```javascript
var validShotTypes = ['ESTAB', 'WS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'INSERT'];
if (validShotTypes.indexOf(clip.shotType) === -1) {
  throw new Error('Invalid shot type: ' + clip.shotType);
}
```

---

## XMP Mapping

| JSON Field | XMP Field | Example |
|------------|-----------|---------|
| `shotName` | `xmpDM:shotName` | `"kitchen-oven-cleaning-ESTAB"` |
| `description` | `dc:description` | `"stainless-steel, gas-range"` |
| `location`, `subject`, `action`, `shotType` | `xmpDM:LogComment` | `"location=kitchen\nsubject=oven\naction=cleaning\nshotType=ESTAB"` |

**Note:** Current implementation uses `xmpDM:logComment` (lowercase) - needs migration to `xmpDM:LogComment` (capital 'C').

---

**See Also:**
- `005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md` - Complete schema documentation
- `CLAUDE.md` - CEP Panel operational guide
- `000001-DOC-METADATA-STRATEGY-SHARED.md` - XMP field mapping

**Last Updated:** 2025-11-18
