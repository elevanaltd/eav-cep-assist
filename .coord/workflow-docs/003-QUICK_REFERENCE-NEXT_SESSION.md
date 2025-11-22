# Quick Reference - Next Session Start

**Last Updated:** 2025-11-22
**Session Status:** DEBUGGING JSON Sidecar Integration - Awaiting test results

---

## **⚡ Quick Start Commands**

```bash
cd /Volumes/HestAI-Projects/eav-cep-assist

# Deploy both panels (includes latest diagnostics)
./deploy-navigation.sh && ./deploy-metadata.sh

# Then restart Premiere Pro (Cmd+Q)
```

---

## **🎯 Current Priority: JSON Metadata Loading**

**Issue:** Metadata Panel returns `null` when trying to read `.ingest-metadata.json` from test folder

**Status:** DEBUGGING with enhanced ExtendScript diagnostics

### **What We Know:**
1. ✅ JSON file exists at correct path (verified manually)
2. ✅ Premiere Pro knows correct media path
3. ✅ File is readable (2.5K, Schema 2.0, valid JSON)
4. ✅ `findProjectItemByNodeId` function added to track-a-integration.jsx
5. ❌ ExtendScript returns `null` when trying to read file

### **Latest Diagnostic Output (2025-11-22 00:50:11):**
```
[MetadataForm] Clip paths: Media:/Volumes/videos-current/.../test-minimal/EA001621.JPG|Proxy: null
[MetadataForm] JSON response: null
[MetadataForm] ✗ Metadata file not found
```

**Missing:** ExtendScript debug logs (should show `DEBUG: mediaPath=...`, `DEBUG: File.exists=...`)

---

## **📋 Next Steps for Continuation**

### **1. Test Latest Deployment (IMMEDIATE)**

```bash
# Restart Premiere Pro
# Open Metadata Panel → Debug Console
# Click EA001621.JPG from test-minimal folder
# Check for ExtendScript debug logs
```

**Expected Output:**
```
[MetadataForm] Clip paths: Media:/Volumes/.../test-minimal/EA001621.JPG|Proxy:null
[MetadataForm] → ExtendScript: DEBUG: mediaPath=/Volumes/.../test-minimal/EA001621.JPG (type=string)
[MetadataForm] → ExtendScript: DEBUG: Attempting read from: /Volumes/.../test-minimal/.ingest-metadata.json
[MetadataForm] → ExtendScript: DEBUG: File.exists=false (or true)
[MetadataForm] → ExtendScript: DEBUG: File.fsName=/Volumes/.../.ingest-metadata.json
```

**If logs still missing:** The $.writeln() interception may not be working - check ExtendScript Console directly

**If File.exists=false:** Issue is with ExtendScript File API - possible causes:
- Path with spaces not handled correctly
- File permissions issue
- ExtendScript File constructor behavior with `.` prefix files

### **2. Investigate File.exists=false (IF APPLICABLE)**

Possible solutions to test:
- Try creating test JSON without `.` prefix: `ingest-metadata.json` (no dot)
- Check ExtendScript File API documentation for hidden file handling
- Test with File.decode() if path encoding is issue
- Verify file permissions allow ExtendScript access

### **3. Verify Test Environment**

**Test Folder:**
```
/Volumes/videos-current/2. WORKING PROJECTS/Berkeley/EAV014 - KV2 Podium Houses/04-media/images/photos/test-minimal/
```

**Contents:**
```bash
ls -la /Volumes/videos-current/.../test-minimal/
# Should show:
# EA001621.JPG
# EA001622.JPG
# EA001623.JPG
# .ingest-metadata.json (2569 bytes)
```

**JSON Validation:**
```bash
jq '.EA001621' /Volumes/videos-current/.../test-minimal/.ingest-metadata.json
# Should return metadata object with id, shotName, location, etc.
```

---

## **📂 Files Modified This Session**

### **jsx/generated/track-a-integration.jsx**
- **Line 20-36:** Added `findProjectItemByNodeId()` function (was missing, causing crashes)
- **Line 145-165:** Added unconditional $.writeln() debug logging
  - Shows mediaPath, jsonPath, File.exists, File.fsName
  - Helps diagnose why file isn't found

### **js/metadata-panel.js**
- **Line 378-399:** Enhanced error capture wrapper
  - Wraps ExtendScript call in try/catch
  - Returns "ERROR: message at line X" instead of "EvalScript error."
  - Intercepts $.writeln() output and returns to CEP panel
- **Line 401-426:** Debug log parsing and display
  - Splits response into PATHS, DEBUG logs, and JSON
  - Shows ExtendScript diagnostic messages in panel console
- **Line 428-435:** ExtendScript error detection
  - Checks for "ERROR:" prefix in response
  - Shows actual exception message instead of generic error

---

## **🔍 Diagnostic Commands**

### **Check JSON File:**
```bash
ls -lh "/Volumes/videos-current/2. WORKING PROJECTS/Berkeley/EAV014 - KV2 Podium Houses/04-media/images/photos/test-minimal/.ingest-metadata.json"
```

### **Validate JSON Content:**
```bash
jq '._schema, (. | keys | map(select(startswith("_") | not)) | length)' "/Volumes/videos-current/.../test-minimal/.ingest-metadata.json"
# Expected: "2.0" and 3
```

### **Check EA001621 Entry:**
```bash
jq '.EA001621.shotName' "/Volumes/videos-current/.../test-minimal/.ingest-metadata.json"
# Expected: "kitchen-counter-stove-MID-#1"
```

### **Manual ExtendScript Test (IF NEEDED):**
```javascript
// Premiere Pro → Help → Console
var testPath = "/Volumes/videos-current/2. WORKING PROJECTS/Berkeley/EAV014 - KV2 Podium Houses/04-media/images/photos/test-minimal/.ingest-metadata.json";
var testFile = new File(testPath);
testFile.exists
// Expected: true

testFile.fsName
// Shows how ExtendScript interprets the path
```

---

## **🚨 Known Issues**

### **Issue #1: ExtendScript Debug Logs Not Appearing**

**Symptom:** No `[MetadataForm] → ExtendScript: DEBUG:` lines in output

**Possible Causes:**
1. $.writeln() interception not working (try/catch wrapper issue)
2. Script execution failing before debug calls
3. Debug logs being filtered out somewhere

**Next Action:** Check ExtendScript Console directly (Premiere Pro → Help → Console)

### **Issue #2: File.exists Returns False (HYPOTHESIS)**

**Symptom:** ExtendScript can't find `.ingest-metadata.json` despite file existing

**Possible Causes:**
1. ExtendScript File API doesn't handle hidden files (`.` prefix)
2. Path with spaces not properly encoded
3. File permissions prevent ExtendScript access
4. Volume mounting issue (/Volumes/videos-current)

**Next Action:** Test alternative file names/locations

---

## **🧪 Alternative Test Cases (IF NEEDED)**

### **Test 1: File Without Dot Prefix**
```bash
cp "/Volumes/videos-current/.../test-minimal/.ingest-metadata.json" \
   "/Volumes/videos-current/.../test-minimal/ingest-metadata.json"
```
Modify track-a-integration.jsx to look for `ingest-metadata.json` instead

### **Test 2: Simpler Path Without Spaces**
```bash
mkdir -p /tmp/cep-test
cp "/Volumes/videos-current/.../test-minimal/EA001621.JPG" /tmp/cep-test/
cp "/Volumes/videos-current/.../test-minimal/.ingest-metadata.json" /tmp/cep-test/
```
Import from `/tmp/cep-test/` instead

### **Test 3: Direct ExtendScript File Test**
Create minimal test script to isolate File API behavior

---

## **💾 Git Status**

**Current Branch:** `chore/update-dependencies`

**Uncommitted Changes:**
- `jsx/generated/track-a-integration.jsx` - findProjectItemByNodeId + debug logging
- `js/metadata-panel.js` - error capture + diagnostics
- `.coord/workflow-docs/002-CEP_PANEL_CURRENT_STATE-BUILD-STATUS.md` - updated status
- `.coord/workflow-docs/003-QUICK_REFERENCE-NEXT_SESSION.md` - this file

**Ready to Commit:** NO - awaiting test results to confirm fix

---

## **📞 Session Handoff Notes**

### **Context for Next Session:**

**Where We Are:**
- Investigating why ExtendScript can't read JSON sidecar files
- Root cause #1 fixed (missing function)
- Enhanced diagnostics deployed
- Awaiting test results to see actual File.exists status

**What We Need:**
- User to restart Premiere Pro and test
- Check for ExtendScript debug logs in panel console
- If logs missing, check ExtendScript Console directly
- File.exists result will reveal next debugging step

**Likely Outcomes:**
1. **File.exists=true:** JSON parsing issue → check readJSONFromFile()
2. **File.exists=false:** File API issue → test alternative approaches
3. **No debug logs:** Wrapper issue → check ExtendScript Console directly

### **Quick Continuation Prompt:**

```
I'm continuing the CEP Panel JSON metadata debugging session.

Last session status:
- Added findProjectItemByNodeId to track-a-integration.jsx
- Added unconditional $.writeln() debug logging
- Deployed enhanced diagnostics
- Awaiting test results showing why ExtendScript can't find .ingest-metadata.json

The user just tested and the diagnostic output shows:
[PASTE DIAGNOSTIC OUTPUT HERE]

What's the next step to resolve the File.exists issue?
```

---

## **🎬 Testing Workflow for User**

1. **Restart Premiere Pro** (Cmd+Q, reopen)

2. **Open Metadata Panel Debug Console:**
   - Window → Extensions → EAV Ingest Assistant - Metadata
   - Right-click panel → Debug → Console tab
   - Click "Clear Debug" button

3. **Click EA001621.JPG** (from test-minimal folder in Project Panel)

4. **Check debug output for:**
   - `[MetadataForm] Clip paths:` line (should show test-minimal path)
   - `[MetadataForm] → ExtendScript: DEBUG:` lines (should show file operations)
   - `[MetadataForm] JSON response:` line (currently returns null)

5. **Share complete output** including all ExtendScript debug lines

---

**✨ Session paused - awaiting test results with enhanced diagnostics**
