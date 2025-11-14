# TEST SPECIFICATION: LogComment Attribute-Format Parsing

**Status:** RED Phase - Expected Behavior Documentation (Code Currently Broken)
**Priority:** CRITICAL (XMP metadata reads return EMPTY for all structured fields)
**File Under Test:** `jsx/host.jsx:898-937`
**Date:** 2025-11-14

---

## OVERVIEW

This test specification documents the **REQUIRED behavior** for parsing Premiere Pro's XMP metadata LogComment field. Current regex implementation is broken because it searches for **element format** (`<tag>value</tag>`) but Premiere returns **attribute format** (`tag="value"`), resulting in empty metadata in Metadata Panel.

---

## PROBLEM STATEMENT

### Current Broken Behavior

**Code (jsx/host.jsx:900-904):**
```javascript
var logCommentMatch = xmpString.match(/<xmpDM:LogComment>(.*?)<\/xmpDM:LogComment>/);
if (!logCommentMatch) {
  $.writeln('DEBUG: LogComment (capital C) not found, trying lowercase...');
  logCommentMatch = xmpString.match(/<xmpDM:logComment>(.*?)<\/xmpDM:logComment>/);
}
```

**Expected Format (regex searches):**
```xml
<xmpDM:LogComment>location=lounge, subject=vent, shotType=CU</xmpDM:LogComment>
```

**Actual Format (Premiere Pro returns):**
```xml
<rdf:Description
  xmpDM:logComment="location=lounge, subject=vent, shotType=CU"
  xmpDM:LogComment="location=, subject=, action=, shotType="
  ...>
</rdf:Description>
```

### Why It Fails

| Issue | Details |
|-------|---------|
| **Format Mismatch** | Regex expects `<tag>value</tag>` (element); Premiere returns `tag="value"` (attribute) |
| **Empty Results** | `logCommentMatch` is always `null` → regex never matches |
| **Field Corruption** | Structured fields (location, subject, action, shotType) all populate as EMPTY strings |
| **CEP Panel Result** | Metadata Panel shows blank form even when XMP contains valid data |

---

## TEST CASE: LogComment Attribute-Format Parsing

### OBJECTIVE

Verify that ExtendScript correctly extracts location, subject, action, and shotType from Premiere Pro's attribute-format LogComment XMP field.

### TEST PRECONDITIONS

1. **Premiere Pro** is running with eav-cep-assist deployed
2. **Project** contains clips with XMP metadata (e.g., EA001890.JPG from ingest-assistant import)
3. **Both panels** are open (Navigation Panel + Metadata Panel)
4. **ExtendScript console** is visible (Help → Console, or Cmd+F12)
5. **CEP DevTools** is accessible (right-click panel → Debug)

### TEST DATA

#### Real XMP Example (EA001890.JPG)

**Source:** Ingest Assistant generates this XMP when importing video/image

```xml
<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      rdf:about="UUID:EA001890"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmpDM="http://ns.adobe.com/xmpDM/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      dc:identifier="EA001890"
      dc:description="hallway, front-door, safety-chain"
      xmpDM:logComment="location=hallway, subject=front-door, action=safety-chain, shotType=CU"
      xmpDM:LogComment="location=hallway, subject=front-door, action=safety-chain, shotType=CU">
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
```

**Notes:**
- Ingest Assistant writes **lowercase** `xmpDM:logComment` (IA standard)
- CEP Panel should write **capital** `xmpDM:LogComment` (production standard)
- Both may coexist during transition period

#### XMP Attribute Format Characteristics

| Aspect | Details |
|--------|---------|
| **Namespace** | `xmlns:xmpDM="http://ns.adobe.com/xmpDM/"` |
| **Field Name** | `xmpDM:logComment` (IA) or `xmpDM:LogComment` (CEP) |
| **Value Format** | `tag="value"` (XML attribute, not element) |
| **Value Content** | CSV key=value pairs: `location=X, subject=Y, action=Z, shotType=W` |
| **Whitespace** | Trimmed in parser (e.g., `subject= vent` → `vent`) |
| **Empty Handling** | Missing fields or empty values returned as empty strings |

---

## VERIFICATION STEPS (MANUAL PROCEDURE)

### Step 1: Deploy Latest Code
```bash
cd /Volumes/HestAI-Projects/eav-cep-assist
./deploy-navigation.sh && ./deploy-metadata.sh
```

### Step 2: Open Premiere Pro & Reload Extensions
```bash
# Quit Premiere Pro completely
killall "Premiere Pro"

# Wait 3 seconds, then reopen Premiere Pro
# Window → Extensions → EAV Ingest Assistant - Navigation
# Window → Extensions → EAV Ingest Assistant - Metadata
```

### Step 3: Navigate to Test Clip

**Navigation Panel:**
1. In bottom Navigation Panel, locate clip **EA001890.JPG** (or similar with XMP metadata)
2. Click clip → should trigger `DEBUG: Loading clip EA001890...` in ExtendScript console

**Source Monitor:** Verify clip opens (indicates clip selection worked)

### Step 4: Monitor ExtendScript Console

**Open ExtendScript Console:**
- Premiere Pro → Help → Console (or Cmd+F12 macOS)

**Look for this output sequence:**
```
[Step 1] DEBUG: Loading clip EA001890.JPG
[Step 2] DEBUG: Getting XMP for clip...
[Step 3] DEBUG: XMP String retrieved (length=XXX characters)
[Step 4] DEBUG: Found identifier in XMP: 'EA001890'
[Step 5] DEBUG: Found LogComment: 'location=hallway, subject=front-door, action=safety-chain, shotType=CU'
[Step 6] DEBUG: Parsed location='hallway'
[Step 7] DEBUG: Parsed subject='front-door'
[Step 8] DEBUG: Parsed action='safety-chain'
[Step 9] DEBUG: Parsed shot='CU'
```

**CRITICAL MARKERS:**
- ✓ **SUCCESS:** `DEBUG: Found LogComment: 'location=...` appears
- ✗ **FAILURE:** `DEBUG: LogComment not found, using legacy XMP fields` appears (indicates regex failed)

### Step 5: Check Metadata Panel Console

**Open CEP DevTools:**
- Right-click Metadata Panel → Debug
- Click "Console" tab in DevTools

**Expected Output:**
```
[MetadataForm] ✓ Loaded clip: EA001890.JPG
[MetadataForm] Location: hallway
[MetadataForm] Subject: front-door
[MetadataForm] Action: safety-chain
[MetadataForm] Shot Type: CU
```

### Step 6: Verify Form Population

**Metadata Panel Form:**
1. **Identifier** field → should show `EA001890`
2. **Description** field → should show `hallway, front-door, safety-chain`
3. **Location** field → should show `hallway`
4. **Subject** field → should show `front-door`
5. **Action** field → should show `safety-chain`
6. **Shot Type** field → should show `CU`

**Screenshot Test:** Take screenshot for before/after comparison

---

## SUCCESS CRITERIA

All of the following MUST be true:

### ✓ Parsing Success (ExtendScript)

| Criterion | Verification |
|-----------|--------------|
| **Regex Matches** | ExtendScript console shows `DEBUG: Found LogComment:` (NOT "LogComment not found") |
| **Value Extraction** | Console shows parsed values: `location=hallway`, `subject=front-door`, etc. |
| **No Fallback** | Does NOT log `DEBUG: LogComment not found, using legacy XMP fields` |
| **Whitespace Handling** | Trimmed values (e.g., `location= hallway` becomes `hallway`) |

### ✓ Form Population (CEP Panel)

| Field | Expected Value | Success Test |
|-------|----------------|--------------|
| Identifier | `EA001890` | Form shows identifier |
| Description | `hallway, front-door, safety-chain` | Description field populated |
| Location | `hallway` | Location dropdown shows/accepts value |
| Subject | `front-door` | Subject field populated |
| Action | `safety-chain` | Action field populated |
| Shot Type | `CU` | Shot Type dropdown shows value |

### ✓ Persistence Test

1. **Fill all fields** with test values (Location=`kitchen`, Subject=`oven`, Action=`opening`, Shot Type=`CU`)
2. **Click "Apply to Premiere"** → Green checkmark appears
3. **Click different clip** → Fields should clear
4. **Click original clip again** → Fields should reload with original values
5. **Check XMP** → Both `xmpDM:logComment` (IA) and `xmpDM:LogComment` (CEP) should have correct values

### ✓ Legacy IA Compatibility

If clip has **only lowercase** `xmpDM:logComment` (IA-generated):

| Test | Expected Behavior |
|------|-------------------|
| **Regex fallback** | Should try capital first, fall back to lowercase |
| **Parsing succeeds** | ExtendScript logs `DEBUG: Found LogComment:` with values |
| **Form populated** | All structured fields appear in Metadata Panel |
| **No errors** | ExtendScript console shows no `DEBUG XMP ERROR:` messages |

---

## FAILURE EVIDENCE (CURRENT STATE - BROKEN)

### Current Broken Output (ExtendScript Console)

```
DEBUG: Loading clip EA001890.JPG
DEBUG: Getting XMP for clip...
DEBUG: XMP String retrieved (length=2847 characters)
DEBUG: Found identifier in XMP: 'EA001890'
DEBUG: LogComment (capital C) not found, trying lowercase...
DEBUG: LogComment not found, using legacy XMP fields
DEBUG: [FALLBACK] Trying legacy Shot field: xmp:Shot=CU
```

**Problem:** Regex never matches because it searches for element format instead of attribute format.

### Current Broken Form State (Metadata Panel)

```
Identifier: EA001890          [✓ populated - identifier is element format]
Description: hallway, ...      [✓ populated - description is element format]
Location:                      [✗ EMPTY - from logComment, never parsed]
Subject:                       [✗ EMPTY - from logComment, never parsed]
Action:                        [✗ EMPTY - from logComment, never parsed]
Shot Type: CU                  [✓ populated - legacy fallback works]
```

**Impact:** User sees incomplete metadata form; must re-enter location/subject/action manually.

---

## REGEX PATTERNS & FORMAT ANALYSIS

### Pattern 1: Element Format (BROKEN - Current Code)

**What code searches for:**
```javascript
/<xmpDM:LogComment>(.*?)<\/xmpDM:LogComment>/
```

**Matches this format (DOES NOT EXIST in Premiere output):**
```xml
<xmpDM:LogComment>location=hallway, subject=door</xmpDM:LogComment>
```

**Result:** NO MATCH → regex returns `null`

### Pattern 2: Attribute Format (REQUIRED - Fixed Code)

**What we need to search for:**
```javascript
/xmpDM:LogComment="([^"]*)"/
```

**Matches this format (ACTUAL Premiere output):**
```xml
xmpDM:LogComment="location=hallway, subject=door, action=open, shotType=CU"
```

**Result:** MATCH → regex captures `location=hallway, subject=door, action=open, shotType=CU`

### Pattern 3: Case-Insensitive Fallback (IA Compatibility)

**Search for both variants:**
```javascript
/xmpDM:[Ll]og[Cc]omment="([^"]*)"/
```

**Matches both:**
- `xmpDM:logComment="..."` (Ingest Assistant legacy)
- `xmpDM:LogComment="..."` (CEP Panel production)

---

## IMPLEMENTATION REQUIREMENTS (RED → GREEN Phase)

### Code Under Test
**File:** `/Volumes/HestAI-Projects/eav-cep-assist/jsx/host.jsx`
**Lines:** 898-937

### What Must Change
| Item | Current | Required |
|------|---------|----------|
| **Element regex** | `/<xmpDM:LogComment>(.*?)<\/xmpDM:LogComment>/` | DELETE (wrong format) |
| **Attribute regex** | NOT IMPLEMENTED | ADD: `/xmpDM:[Ll]og[Cc]omment="([^"]*)"/` |
| **Match extraction** | `logCommentMatch[1]` | Same (after fix) |
| **Fallback logic** | Tries both element formats | Handle single attribute regex, case-insensitive |

### Test Expectations
1. **RED Test:** Regex fails with current code (logComment is null)
2. **GREEN Test:** After fix, regex matches and extracts values
3. **REFACTOR:** Optimize regex for readability without changing behavior

---

## EVIDENCE & AUDIT TRAIL

### Commit References
- **Introduces Bug:** Unknown (pre-existing from prototype phase)
- **Diagnostic Output:** Lines 900-945 (ExtendScript debug logging)
- **Related Issues:**
  - Metadata persistence test fails (CLAUDE.md line 121-136)
  - Description appears but location/subject don't

### Console Output Validation

When test runs successfully, ExtendScript console will show:

```javascript
// === Extract from getClipMetadata() call ===
$.writeln('DEBUG: Found LogComment: \'location=hallway, subject=front-door, action=safety-chain, shotType=CU\'');
$.writeln('DEBUG: Parsed location=\'hallway\'');
$.writeln('DEBUG: Parsed subject=\'front-door\'');
$.writeln('DEBUG: Parsed action=\'safety-chain\'');
$.writeln('DEBUG: Parsed shot=\'CU\'');
```

This evidence proves regex successfully matched and extracted all four structured fields.

---

## TESTING RESOURCES

### XMP Sample Files

**File:** EA001890.JPG (from ingest-assistant import)
**Location:** `/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/EA001890.JPG`
**Contains:**
- `dc:identifier="EA001890"` (element format)
- `dc:description` with keywords (element format)
- `xmpDM:logComment="location=hallway..."` (attribute format - LOWERCASE)

### Related Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` (lines 121-136) | XMP Persistence Test - documents expected behavior |
| `002-DOC-ML-FEEDBACK-LOOP.md` | JSON v2.0 schema - documents structured fields |
| `001-DOC-PROTOTYPE-LEGACY.md` | Legacy metadata handling for backward compatibility |

### Debug Console Locations

| Console | Access | Shows |
|---------|--------|-------|
| ExtendScript | Help → Console (Cmd+F12) | jsx/host.jsx execution |
| Metadata Panel DevTools | Right-click → Debug | js/metadata-panel.js execution |
| Navigation Panel DevTools | Right-click → Debug | js/navigation-panel.js execution |

---

## REGRESSION PREVENTION

### Tests to Run After Fix

1. **Element Format Handling** - If code encounters `<xmpDM:LogComment>element</xmpDM:LogComment>`, should it still work?
   - **Current:** No (would need separate regex)
   - **Recommended:** Attribute format primary, element format fallback (for future XMPScript SDK migration)

2. **Uppercase vs Lowercase** - Both should work:
   - `xmpDM:logComment="..."` (IA legacy)
   - `xmpDM:LogComment="..."` (CEP production)
   - Test with both variants

3. **Empty/Missing Values** - Structured fields should handle:
   - Missing: `location=, subject=, action=, shotType=` (empty values)
   - Absent: `subject=value` (missing some keys)
   - Whitespace: `location= value ` (space padding)

4. **Persistence Cycle**
   - Load clip → fields populate
   - Edit fields → Generated Name updates
   - Apply to Premiere → XMP written
   - Switch to other clip → fields clear
   - Switch back → fields reload with new values

---

## COMPLETION CHECKLIST

### Before Implementation (RED Phase)
- [x] Problem documented (element vs attribute format)
- [x] Test case written (manual procedure)
- [x] Success/failure criteria defined
- [x] Regex patterns documented
- [x] Evidence examples provided
- [x] Resources identified (sample files, consoles)

### After Fix (GREEN Phase)
- [ ] Regex updated to attribute format
- [ ] ExtendScript console shows successful parses
- [ ] Metadata Panel form populates all fields
- [ ] Persistence test passes (reload shows same values)
- [ ] No regression (legacy IA files still work)

### After Optimization (REFACTOR Phase)
- [ ] Code reviewed for clarity
- [ ] Comments explain attribute format parsing
- [ ] Unit test documentation updated
- [ ] CLAUDE.md updated with fix details

---

## APPENDIX: XMP Namespace Reference

### Dublin Core (Element Format - WORKS)
```xml
<dc:identifier>EA001890</dc:identifier>
<dc:description>
  <rdf:Alt>
    <rdf:li xml:lang="x-default">hallway, door, chain</rdf:li>
  </rdf:Alt>
</dc:description>
```

**Parsing:** Element regex works ✓

### XMP Media (Attribute Format - BROKEN in Current Code)
```xml
<rdf:Description
  xmpDM:logComment="location=hallway, subject=door, action=open, shotType=CU"
  xmpDM:LogComment="location=hallway, subject=door, action=open, shotType=CU">
</rdf:Description>
```

**Parsing:** Element regex fails ✗
**Fix:** Switch to attribute regex ✓

### Key Insight
Premiere Pro's `getXMPMetadata()` **flattens nested XML to attributes** when returning to ExtendScript. This is Adobe's optimization—not all XMP fields arrive as elements.

---

**Status:** RED Phase Complete - Ready for GREEN Phase Implementation
**Next Step:** Fix regex pattern in jsx/host.jsx lines 900-905, then run manual verification steps
