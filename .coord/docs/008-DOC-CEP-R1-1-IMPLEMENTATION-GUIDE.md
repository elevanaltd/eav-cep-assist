# R1.1 Schema - Production Examples & CEP Implementation Guide

**Document Type:** Implementation Examples
**Schema Version:** R1.1
**Last Updated:** 2025-11-18
**Related:** `005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md`

---

## 1. PRODUCTION TEST FIXTURE

**File Location:** `.coord/test-fixtures/.ingest-metadata-r1.1.json`

**Test Scenario:** 3 clips with different states
- `EAV0TEST1`: Fully populated with keywords, no locks
- `EAV0TEST2`: Empty keywords, no locks (typical IA output)
- `EAV0TEST3`: With keywords AND field-level locks (edited state)

**Validation Points:**
- ✅ `shotName` includes `#N` format
- ✅ `keywords` is array (can be empty)
- ✅ `lockedFields` array (can be empty or contain field names)
- ✅ `_completed` flag at root level
- ✅ All required identity fields present

---

## 2. CEP PANEL IMPLEMENTATION NOTES

### **2.1 ExtendScript Path Resolution**

**Test Results (Premiere Pro Integration Test):**
```
Clip: EAV0TEST2.MOV
  Tape Name: N/A  (will be set by IA in production)
  Media Path: /test-videos-raw/EAV0TEST2.MOV
  Has Proxy: true
  Proxy Path: /test-videos-proxy/EAV0TEST2_Proxy.mov
```

**Key Findings:**
1. `clip.getMediaPath()` → Always returns RAW path (even if proxy attached)
2. `clip.getProxyPath()` → Returns proxy path (only if attached)
3. `clip.hasProxy()` → Boolean check for proxy attachment
4. JSON file co-located with PROXY files (NOT raw files)

---

### **2.2 Clip ID Extraction Strategy**

**Priority Order (Immutable ID):**

1. **Premiere Pro Tape Name** (set by IA - immutable, survives relinking)
   ```javascript
   // Strategy 1: Extract from XMP metadata
   var tapeName = extractTapeNameFromXMP(clipItem.getProjectMetadata());
   if (tapeName) return tapeName; // e.g., "EAV0TEST2"
   ```

2. **Derive from Proxy Filename** (if proxy attached)
   ```javascript
   // Strategy 2: Parse proxy filename
   if (clipItem.hasProxy()) {
     var proxyPath = clipItem.getProxyPath();
     // "EAV0TEST2_Proxy.mov" → "EAV0TEST2"
     var clipId = proxyPath.match(/([^\/]+)_Proxy\./)[1];
     return clipId;
   }
   ```

3. **Use clip.name without extension** (fallback for offline)
   ```javascript
   // Strategy 3: Fallback for offline clips
   var clipName = clipItem.name; // "EAV0TEST2.MOV"
   return clipName.replace(/\.[^.]+$/, ''); // "EAV0TEST2"
   ```

**Rationale:**
- Tape Name = Immutable (set by IA, survives relinking)
- Proxy Filename = Reliable (IA naming convention)
- clip.name = Fallback (user may rename in PP)

---

### **2.3 JSON Lookup Algorithm**

**Two-Stage Lookup (Proxy First, Raw Fallback):**

```javascript
// jsx/host.jsx: Locate .ingest-metadata.json for clip
function getMetadataFilePathForClip(clipItem) {
  var clipId = getClipId(clipItem);
  var metadataPath = null;

  // STAGE 1: Check proxy folder (PRIMARY)
  if (clipItem.hasProxy()) {
    var proxyPath = clipItem.getProxyPath();
    if (proxyPath) {
      var proxyFolder = extractFolder(proxyPath);
      metadataPath = proxyFolder + '/.ingest-metadata.json';

      if (fileExists(metadataPath)) {
        return {
          success: true,
          path: metadataPath,
          clipId: clipId,
          source: 'proxy-folder'
        };
      }
    }
  }

  // STAGE 2: Fallback to raw folder
  var mediaPath = clipItem.getMediaPath();
  if (mediaPath) {
    var mediaFolder = extractFolder(mediaPath);
    metadataPath = mediaFolder + '/.ingest-metadata.json';

    if (fileExists(metadataPath)) {
      return {
        success: true,
        path: metadataPath,
        clipId: clipId,
        source: 'raw-folder'
      };
    }
  }

  return {
    success: false,
    error: 'Metadata file not found (checked proxy and raw folders)',
    clipId: clipId
  };
}

function extractFolder(filePath) {
  return filePath.substring(0, filePath.lastIndexOf('/'));
}

function fileExists(path) {
  var file = new File(path);
  return file.exists;
}
```

**Expected Behavior:**
- Production workflow: JSON found in proxy folder (most common)
- Offline workflow: JSON found in raw folder (proxy not attached)
- Error case: JSON not found in either location (show user-friendly error)

---

### **2.4 Handling Offline Clips**

**Scenario:** Clip is offline (proxy not attached, media path unavailable)

**Strategy:**
1. Use `clip.name` to derive clip ID
2. Prompt user to provide shoot folder location
3. Construct metadata path: `{user-provided-folder}/.ingest-metadata.json`

**ExtendScript Implementation:**
```javascript
// jsx/host.jsx: Handle offline clip scenario
function getMetadataForOfflineClip(clipItem) {
  var clipId = clipItem.name.replace(/\.[^.]+$/, ''); // Remove extension

  // Prompt user for shoot folder location
  var shootFolder = Folder.selectDialog(
    'Clip is offline. Please select the shoot folder containing .ingest-metadata.json'
  );

  if (!shootFolder) {
    return {
      success: false,
      error: 'User cancelled offline clip lookup',
      clipId: clipId
    };
  }

  var metadataPath = shootFolder.fsName + '/.ingest-metadata.json';

  if (fileExists(metadataPath)) {
    return {
      success: true,
      path: metadataPath,
      clipId: clipId,
      source: 'user-selected-folder'
    };
  }

  return {
    success: false,
    error: 'Metadata file not found in selected folder',
    clipId: clipId
  };
}
```

---

## 3. KEYWORDS FIELD HANDLING

### **3.1 CEP Panel → JSON (Array Storage)**

**Form Input:**
```html
<input type="text" id="keywords" placeholder="door, chain, lock" />
```

**JavaScript Conversion:**
```javascript
// CEP Panel: Convert comma-separated string to array
function convertKeywordsToArray(keywordsString) {
  if (!keywordsString || keywordsString.trim() === '') {
    return [];
  }

  return keywordsString.split(',').map(function(keyword) {
    return keyword.trim();
  }).filter(function(keyword) {
    return keyword.length > 0;
  });
}

// Example usage:
var userInput = "door, chain, lock";
var keywordsArray = convertKeywordsToArray(userInput);
// Result: ["door", "chain", "lock"]
```

---

### **3.2 JSON → CEP Panel (Array Display)**

**JSON Data:**
```json
"keywords": ["door", "chain", "lock"]
```

**JavaScript Conversion:**
```javascript
// CEP Panel: Convert array to comma-separated string for display
function convertKeywordsToString(keywordsArray) {
  if (!Array.isArray(keywordsArray) || keywordsArray.length === 0) {
    return '';
  }

  return keywordsArray.join(', ');
}

// Example usage:
var keywordsArray = ["door", "chain", "lock"];
var displayString = convertKeywordsToString(keywordsArray);
// Result: "door, chain, lock"

document.getElementById('keywords').value = displayString;
```

---

### **3.3 XMP Write (Array → String)**

**JSON to XMP Conversion:**
```javascript
// jsx/host.jsx: Write keywords array to XMP dc:description
function writeKeywordsToXMP(clipItem, keywordsArray) {
  var xmpString = clipItem.getProjectMetadata();

  // Convert array to comma-separated string for XMP
  var keywordsString = keywordsArray.join(', ');

  // Write to dc:description
  xmpString = updateXMPField(xmpString, 'dc', 'description', keywordsString);

  clipItem.setProjectMetadata(xmpString, ['dc:description']);

  return { success: true };
}

// Example:
var keywords = ["door", "chain", "lock"];
writeKeywordsToXMP(clipItem, keywords);
// XMP result: <dc:description>door, chain, lock</dc:description>
```

---

## 4. FIELD-LEVEL LOCK ENFORCEMENT

### **4.1 UI State Management**

**Example: EAV0TEST3 (Location and Subject locked)**

**JSON Data:**
```json
{
  "id": "EAV0TEST3",
  "location": "hallway",
  "subject": "front-door",
  "action": "safety-chain",
  "shotType": "CU",
  "keywords": ["door", "chain", "lock"],
  "lockedFields": ["location", "subject"]
}
```

**CEP Panel UI:**
```javascript
// js/metadata-panel.js: Apply field locks to form
function applyFieldLocks(clip) {
  var lockedFields = clip.lockedFields || [];

  // Disable locked fields
  document.getElementById('location').disabled = (lockedFields.indexOf('location') !== -1);
  document.getElementById('subject').disabled = (lockedFields.indexOf('subject') !== -1);
  document.getElementById('action').disabled = (lockedFields.indexOf('action') !== -1);
  document.getElementById('shot-type').disabled = (lockedFields.indexOf('shotType') !== -1);
  document.getElementById('keywords').disabled = (lockedFields.indexOf('keywords') !== -1);

  // Visual indicator (add lock icon to labels)
  updateFieldLabels(lockedFields);
}

function updateFieldLabels(lockedFields) {
  var fields = ['location', 'subject', 'action', 'shotType', 'keywords'];

  fields.forEach(function(fieldName) {
    var label = document.querySelector('label[for="' + fieldName + '"]');
    if (lockedFields.indexOf(fieldName) !== -1) {
      label.innerHTML = '🔒 ' + label.textContent.replace('🔒 ', '');
    } else {
      label.textContent = label.textContent.replace('🔒 ', '');
    }
  });
}
```

**Expected UI State:**
- ✅ Location field: DISABLED, label shows "🔒 Location"
- ✅ Subject field: DISABLED, label shows "🔒 Subject"
- ✅ Action field: ENABLED, label shows "Action"
- ✅ Shot Type field: ENABLED, label shows "Shot Type"
- ✅ Keywords field: ENABLED, label shows "Keywords"

---

### **4.2 Save Validation**

**Prevent Locked Field Modification:**

```javascript
// js/metadata-panel.js: Validate before save
function validateBeforeSave(originalClip, formData) {
  var lockedFields = originalClip.lockedFields || [];
  var violations = [];

  // Check each locked field
  if (lockedFields.indexOf('location') !== -1 && formData.location !== originalClip.location) {
    violations.push('location');
  }
  if (lockedFields.indexOf('subject') !== -1 && formData.subject !== originalClip.subject) {
    violations.push('subject');
  }
  if (lockedFields.indexOf('action') !== -1 && formData.action !== originalClip.action) {
    violations.push('action');
  }
  if (lockedFields.indexOf('shotType') !== -1 && formData.shotType !== originalClip.shotType) {
    violations.push('shotType');
  }

  if (violations.length > 0) {
    alert(
      '❌ Cannot save changes\n\n' +
      'The following locked fields were modified:\n' +
      violations.join(', ') + '\n\n' +
      'Please revert these fields to their original values.'
    );
    return false;
  }

  return true;
}
```

---

## 5. FOLDER COMPLETION WARNING

### **5.1 Check on Load**

**JSON Data:**
```json
{
  "_schema": "2.0",
  "_completed": true,
  "EAV0TEST2": { ... }
}
```

**CEP Panel Warning:**
```javascript
// js/metadata-panel.js: Check folder completion status
function checkFolderCompletion(metadataData) {
  if (metadataData._completed === true) {
    var proceed = confirm(
      '⚠️ FOLDER MARKED COMPLETE\n\n' +
      'This shoot folder has been marked as complete by Ingest Assistant.\n' +
      'Editing clips may require re-validation.\n\n' +
      'Do you want to proceed with editing?'
    );

    if (!proceed) {
      // Disable all form fields
      disableAllFormFields();
      return false;
    }
  }

  return true;
}

function disableAllFormFields() {
  document.getElementById('location').disabled = true;
  document.getElementById('subject').disabled = true;
  document.getElementById('action').disabled = true;
  document.getElementById('shot-type').disabled = true;
  document.getElementById('keywords').disabled = true;
  document.getElementById('apply-metadata').disabled = true;
}
```

**Expected Behavior:**
- User clicks clip in Navigation Panel
- Metadata Panel loads JSON
- Detects `_completed: true`
- Shows warning dialog
- If user cancels → All fields disabled
- If user proceeds → Normal editing allowed (with warning shown)

---

## 6. SHOT NAME GENERATION

### **6.1 Live Preview**

**Form Fields:**
- Location: `hallway`
- Subject: `front-door`
- Action: `safety-chain`
- Shot Type: `CU`
- Shot Number: `1` (read from JSON, not editable)

**Generated Shot Name:**
```
hallway-front-door-safety-chain-CU-#1
```

**CEP Panel Implementation:**
```javascript
// js/metadata-panel.js: Live preview of shotName
function updateGeneratedName() {
  var location = document.getElementById('location').value.trim();
  var subject = document.getElementById('subject').value.trim();
  var action = document.getElementById('action').value.trim();
  var shotType = document.getElementById('shot-type').value.trim();
  var shotNumber = parseInt(document.getElementById('shot-number').value);

  var generatedName = '';

  if (location && subject && action && shotType && shotNumber > 0) {
    generatedName = location + '-' + subject + '-' + action + '-' + shotType + '-#' + shotNumber;
  }

  document.getElementById('generated-name-preview').textContent = generatedName;
}

// Attach to input events
document.getElementById('location').addEventListener('input', updateGeneratedName);
document.getElementById('subject').addEventListener('input', updateGeneratedName);
document.getElementById('action').addEventListener('input', updateGeneratedName);
document.getElementById('shot-type').addEventListener('change', updateGeneratedName);
```

**HTML Display:**
```html
<div class="generated-name-container">
  <label>Generated Name:</label>
  <span id="generated-name-preview" class="preview-text">hallway-front-door-safety-chain-CU-#1</span>
</div>
```

---

## 7. COMMON ERROR SCENARIOS

### **7.1 JSON File Not Found**

**Scenario:** Clip has proxy, but no `.ingest-metadata.json` in proxy folder

**ExtendScript Error:**
```javascript
{
  success: false,
  error: 'Metadata file not found (checked proxy and raw folders)',
  clipId: 'EAV0TEST2'
}
```

**CEP Panel Handling:**
```javascript
// js/metadata-panel.js: Handle missing JSON file
function handleMetadataNotFound(error) {
  alert(
    '⚠️ Metadata File Not Found\n\n' +
    'Clip ID: ' + error.clipId + '\n\n' +
    'The .ingest-metadata.json file could not be found in:\n' +
    '- Proxy folder\n' +
    '- Raw folder\n\n' +
    'Please ensure the clip has been processed by Ingest Assistant.'
  );

  // Clear form fields
  clearFormFields();
  disableApplyButton();
}
```

---

### **7.2 Clip ID Not in JSON**

**Scenario:** JSON file exists, but clip ID not present

**ExtendScript Error:**
```javascript
{
  success: false,
  error: 'Clip ID not found in metadata file',
  clipId: 'EAV0TEST2',
  metadataPath: '/test-videos-proxy/.ingest-metadata.json'
}
```

**CEP Panel Handling:**
```javascript
// js/metadata-panel.js: Handle missing clip ID
function handleClipIdNotFound(error) {
  var createNew = confirm(
    '⚠️ Clip Not Found in Metadata\n\n' +
    'Clip ID: ' + error.clipId + '\n' +
    'Metadata File: ' + error.metadataPath + '\n\n' +
    'This clip has not been processed by Ingest Assistant.\n\n' +
    'Would you like to create a new metadata entry for this clip?'
  );

  if (createNew) {
    // Create new entry with default values
    createNewMetadataEntry(error.clipId);
  } else {
    clearFormFields();
    disableApplyButton();
  }
}
```

---

### **7.3 Invalid Schema Version**

**Scenario:** JSON file has unsupported schema version

**ExtendScript Error:**
```javascript
{
  success: false,
  error: 'Unsupported schema version',
  schema: '1.0',
  expectedSchema: '2.0'
}
```

**CEP Panel Handling:**
```javascript
// js/metadata-panel.js: Handle schema mismatch
function handleSchemaMismatch(error) {
  alert(
    '❌ Schema Version Mismatch\n\n' +
    'Found schema: ' + error.schema + '\n' +
    'Expected schema: ' + error.expectedSchema + '\n\n' +
    'This metadata file was created with an older version of Ingest Assistant.\n' +
    'Please update the metadata file to the latest schema version.'
  );

  clearFormFields();
  disableApplyButton();
}
```

---

## 8. TESTING CHECKLIST

### **8.1 JSON Lookup Tests**

- [ ] Clip with proxy → JSON found in proxy folder
- [ ] Clip without proxy → JSON found in raw folder
- [ ] Offline clip → User prompted for folder selection
- [ ] No JSON file → Clear error message shown

### **8.2 Field Lock Tests**

- [ ] `lockedFields: []` → All fields editable
- [ ] `lockedFields: ["location"]` → Location disabled, others editable
- [ ] `lockedFields: ["location", "subject"]` → Both disabled
- [ ] Attempt to save locked field → Validation error shown
- [ ] Lock indicator (🔒) shown in UI for locked fields

### **8.3 Folder Completion Tests**

- [ ] `_completed: false` → Normal editing allowed
- [ ] `_completed: true` → Warning shown on load
- [ ] User cancels warning → All fields disabled
- [ ] User proceeds → Editing allowed with warning visible

### **8.4 Keywords Tests**

- [ ] Empty keywords array → Empty input field
- [ ] Keywords array with values → Comma-separated display
- [ ] User input "a, b, c" → Saved as `["a", "b", "c"]`
- [ ] XMP write → Keywords joined with ", " in `dc:description`

### **8.5 Shot Name Tests**

- [ ] Live preview updates on field change
- [ ] shotNumber included in format (`-#1`)
- [ ] Empty fields → Empty preview
- [ ] All fields filled → Complete shotName generated

---

## 9. REFERENCES

**Related Documents:**
- `005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md` - Complete schema specification
- `007-DOC-SCHEMA-MIGRATION-R1-0-TO-R1-1.md` - Migration guide
- `.coord/test-fixtures/.ingest-metadata-r1.1.json` - Production test fixture

**Test Data Source:**
- Actual Premiere Pro integration test (2025-11-18)
- ExtendScript path resolution validation
- User-confirmed field formats and naming

---

**END OF IMPLEMENTATION EXAMPLES**
