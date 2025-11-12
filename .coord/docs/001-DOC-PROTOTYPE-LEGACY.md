# CEP Panel - Prototype Legacy Boundary

**Purpose:** Document which code is "proven working prototype" vs. "needs production hardening"

---

## Prototype Validation Status

**Tag:** `v0.1.0-prototype-validated` (Issues 2, 3, 4 resolved)
**Date:** 2025-11-11
**Validation Evidence:**
- Issue #2: Navigation Panel sorting ✅ FIXED
- Issue #3: Tape Name XMP persistence ✅ FIXED
- Issue #4: XMP namespace corruption ✅ FIXED

---

## PROVEN WORKING CODE (Preserve As-Is)

These components have been validated through real usage and issue resolution. **Do NOT refactor without characterization tests first.**

### 1. XMP Namespace-Aware Write (`jsx/host.jsx:177-447`)

**Status:** ✅ PROVEN (Issue #4 fixed)
**Risk:** 🔴 CRITICAL (metadata corruption if broken)

**What It Does:**
- Writes metadata to Premiere Pro clips via XMP
- Separates Dublin Core namespace (`dc:description`) from XMP namespace (`xmp:Location`, `xmp:Subject`)
- Prevents field corruption by maintaining namespace boundaries

**Key Lines:**
```javascript
// Lines 177-443: updateClipMetadata() - Namespace-aware block manipulation
// Lines 187-220: Dublin Core block (dc:description)
// Lines 221-380: XMP namespace block (xmp:Location, xmp:Subject, xmp:Action, etc.)
```

**Why It's Critical:**
- Bug history: Initially all fields inserted before FIRST `</rdf:Description>` (wrong namespace)
- Fix: Separate Dublin Core and XMP namespace blocks
- Failure mode: Description empty, Location/Subject overwrite each other

**Before Refactoring:**
1. Create characterization test: Write all metadata fields → Read back → Verify no corruption
2. Test edge cases: Empty fields, special characters, long text
3. Verify ExtendScript console shows correct namespaces: `dc:description updated`, `xmp:Location updated`

**Test Strategy:**
```javascript
// Characterization test (manual - requires Premiere Pro)
// 1. Select clip EA001601.MOV
// 2. Fill fields:
//    - Identifier: EA001601.MOV
//    - Description: kitchen, spur-switch, appliances
//    - Location: kitchen
//    - Subject: spur-switch
//    - Action: opening
//    - Shot Type: ESTAB
// 3. Apply to Premiere → Wait for green checkmark
// 4. Click DIFFERENT clip → Fields should clear
// 5. Click EA001601.MOV again → ALL fields should reload with exact values
// 6. Verify ExtendScript console shows namespace separation
```

---

### 2. CEP Event Communication (Navigation → Metadata)

**Status:** ✅ PROVEN (Two-panel architecture working)
**Risk:** 🟡 MODERATE (panels lose sync if broken)

**What It Does:**
- Navigation Panel dispatches `com.eav.clipSelected` event
- Metadata Panel receives event and loads clip data
- Maintains panel synchronization

**Key Files:**
- `js/navigation-panel.js:handleClipClick()` → Dispatches event
- `js/metadata-panel.js:init()` → Listens for event
- CSInterface library handles event routing

**Before Refactoring:**
1. Create integration test: Mock CSInterface → Dispatch event → Verify Metadata Panel receives
2. Test edge cases: Rapid clicks, panel not initialized, invalid clip data

**Test Strategy:**
```javascript
// Integration test (can be automated with mocks)
describe('CEP Event Communication', () => {
  it('should dispatch clip selection from Navigation to Metadata', () => {
    const mockClip = { nodeId: '123', name: 'Test Clip' };

    // Mock CSInterface
    const csInterface = {
      dispatchEvent: jest.fn(),
      addEventListener: jest.fn()
    };

    // Simulate Navigation Panel click
    NavigationPanel.handleClipClick(mockClip);

    // Verify event dispatched
    expect(csInterface.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'com.eav.clipSelected',
        data: JSON.stringify(mockClip)
      })
    );
  });
});
```

---

### 3. Panel State Management (`js/metadata-panel.js`)

**Status:** ✅ PROVEN (Form load/save working)
**Risk:** 🟡 MODERATE (data loss if broken)

**What It Does:**
- Loads clip metadata into form fields
- Generates structured name preview: `{location}-{subject}-{action}-{shotType}`
- Validates required fields
- Saves metadata to Premiere Pro via ExtendScript

**Key Methods:**
- `loadClipIntoForm(clip)` → Populate form from clip data
- `applyMetadata()` → Collect form values, call ExtendScript
- `updateGeneratedName()` → Live preview of structured naming

**Before Refactoring:**
1. Create integration test: Load clip → Edit fields → Save → Reload → Verify persistence
2. Test validation: Empty required fields → Verify error handling
3. Test generated name format: Various field combinations → Verify correct format

**Test Strategy:**
```javascript
// Integration test (can be automated with mocked ExtendScript)
describe('Metadata Panel State', () => {
  it('should persist metadata through save/reload cycle', async () => {
    const clip = { nodeId: '123', name: 'Test' };
    const metadata = {
      location: 'kitchen',
      subject: 'oven',
      action: 'cleaning',
      shotType: 'CU'
    };

    // Load clip
    MetadataPanel.loadClipIntoForm(clip);

    // Fill fields
    document.getElementById('metadataLocation').value = metadata.location;
    document.getElementById('metadataSubject').value = metadata.subject;
    // ... etc

    // Save
    await MetadataPanel.applyMetadata();

    // Reload
    MetadataPanel.loadClipIntoForm(clip);

    // Verify persistence
    expect(document.getElementById('metadataLocation').value).toBe(metadata.location);
    // ... etc
  });
});
```

---

### 4. XMP Warm-Up Delay (`js/navigation-panel.js`)

**Status:** ✅ PROVEN (Issue #3 fixed - "EMPTY" metadata bug)
**Risk:** 🟢 LOW (workaround, not architectural)

**What It Does:**
- Waits 1.5 seconds on first clip load for Premiere Pro XMP cache to initialize
- Prevents "EMPTY" metadata bug (XMP not ready on immediate read)

**Key Lines:**
```javascript
// XMP_WARM_UP_DELAY constant
// loadAllClips() waits before reading metadata
```

**Before Refactoring:**
1. Test without delay: Verify "EMPTY" bug reproduces
2. Test with reduced delay: Find minimum reliable delay
3. Consider alternative: Retry logic instead of fixed delay

**Test Strategy:**
```javascript
// Manual test (requires Premiere Pro)
// 1. Open project with clips
// 2. Remove XMP_WARM_UP_DELAY (set to 0)
// 3. Load Navigation Panel
// 4. Observe: First clip shows "EMPTY" metadata
// 5. Restore XMP_WARM_UP_DELAY (1.5s)
// 6. Reload panel
// 7. Observe: First clip shows correct metadata
```

---

## NEEDS PRODUCTION HARDENING (Test Before Use)

These components work in prototype but lack quality gates for production use.

### 5. Error Handling (All Files)

**Status:** 🔴 INSUFFICIENT
**Risk:** 🟡 MODERATE (poor user experience, hard to debug)

**Current State:**
- Some try-catch blocks exist
- Alert-based error reporting (not user-friendly)
- No centralized error logging
- No error recovery strategies

**Production Requirements:**
1. Centralized error handler with logging
2. User-friendly error messages (no raw exceptions)
3. Error recovery strategies (retry, fallback, graceful degradation)
4. Diagnostic information for debugging (console only, not alerts)

**Example:**
```javascript
// PROTOTYPE (current)
try {
  updateMetadata();
} catch (e) {
  alert('Error: ' + e.toString());  // Not user-friendly
}

// PRODUCTION (target)
try {
  updateMetadata();
} catch (e) {
  ErrorHandler.log('updateMetadata failed', { error: e, clip: currentClip });
  ErrorHandler.showUserMessage('Failed to save metadata. Please try again.');
  // Attempt recovery: Reload clip data
}
```

---

### 6. Input Validation (Metadata Form)

**Status:** 🔴 INSUFFICIENT
**Risk:** 🟡 MODERATE (data quality issues)

**Current State:**
- Minimal validation (required fields check)
- No sanitization (special characters, length limits)
- No format validation (e.g., shot type must be from predefined list)

**Production Requirements:**
1. Field-level validation with error messages
2. Input sanitization (prevent XMP injection, length limits)
3. Format validation (shot type from controlled vocabulary)
4. Real-time validation feedback (not just on save)

**Example:**
```javascript
// PRODUCTION (target)
validateLocation: function(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Location is required' };
  }
  if (value.length > 50) {
    return { valid: false, error: 'Location must be 50 characters or less' };
  }
  if (!/^[a-zA-Z0-9\s\-]+$/.test(value)) {
    return { valid: false, error: 'Location contains invalid characters' };
  }
  return { valid: true };
}
```

---

### 7. ExtendScript Compatibility (`jsx/host.jsx`)

**Status:** ⚠️ ES3 VERIFIED (but no automated checks)
**Risk:** 🟡 MODERATE (breaks on deployment if ES6 sneaks in)

**Current State:**
- ExtendScript is ES3 (no arrow functions, const/let, template literals)
- Manual verification only (no linter enforcement)
- Easy to accidentally use modern syntax

**Production Requirements:**
1. ESLint rule to enforce ES3 syntax (`env: { es3: true }`)
2. Pre-commit hook to verify ExtendScript files
3. Documentation of ES3 constraints
4. Code review checklist for ExtendScript changes

**ES3 Constraints:**
```javascript
// ❌ NOT ALLOWED (ES6+)
const x = 5;                          // Use var
let y = 10;                           // Use var
const fn = (a) => a * 2;             // Use function() {}
const str = `Hello ${name}`;         // Use string concatenation

// ✅ ALLOWED (ES3)
var x = 5;
var y = 10;
function fn(a) { return a * 2; }
var str = 'Hello ' + name;
```

---

## REFACTORING PROTOCOL

**When changing PROVEN WORKING code:**

### Step 1: Characterization Test
```
1. Identify current behavior (inputs → outputs, edge cases)
2. Write test that captures current behavior (even if imperfect)
3. Verify test passes with current code
4. Commit test: `test: Characterize [component] behavior`
```

### Step 2: Refactor
```
1. Change implementation
2. Verify characterization test still passes
3. Refactor test if behavior intentionally changed
4. Commit refactor: `refactor: Improve [component] (behavior unchanged)`
```

### Step 3: Improve
```
1. Add new tests for edge cases or improvements
2. Implement improvements
3. Commit improvements: `feat: Enhance [component] with [feature]`
```

**Example: Refactoring XMP Write**
```bash
# Step 1: Characterization
git commit -m "test: Characterize XMP namespace write behavior"

# Step 2: Refactor
# - Simplify updateClipMetadata() implementation
# - Verify characterization test still passes
git commit -m "refactor: Simplify XMP write (behavior unchanged)"

# Step 3: Improve
# - Add retry logic for XMP write failures
git commit -m "feat: Add retry logic to XMP write"
```

---

## FORWARD DISCIPLINE (New Features)

**When adding NEW features:**

### TDD Cycle (Red → Green → Refactor)
```
1. RED: Write failing test
   - Commit: `test: [Feature] should [behavior]`
2. GREEN: Minimal implementation to pass
   - Commit: `feat: [Feature]`
3. REFACTOR: Improve while tests pass
   - Commit: `refactor: Clean up [Feature]`
```

**Example: New Feature "Batch Metadata Edit"**
```bash
# RED
git commit -m "test: Batch edit should apply metadata to all selected clips"

# GREEN
git commit -m "feat: Batch metadata edit"

# REFACTOR
git commit -m "refactor: Extract batch edit validation logic"
```

---

## TESTING STRATEGY SUMMARY

### Unit Tests (Automated)
- Pure JavaScript functions
- No CEP/ExtendScript dependencies
- Example: `generateClipName()`, `validateMetadata()`

### Integration Tests (Automated with Mocks)
- CEP event system
- Form state management
- ExtendScript calls (mocked)
- Example: Navigation → Metadata sync

### Characterization Tests (Manual - Requires Premiere Pro)
- XMP write operations
- Premiere Pro API interactions
- End-to-end workflows
- Example: Save metadata → Reload → Verify persistence

### Manual Tests (QA Checklist)
- Visual UI testing
- Performance (100+ clips)
- Cross-version compatibility (PP 2024 vs 2025)
- Example: Load large project, verify responsiveness

---

## GIT TAG STRATEGY

**Prototype Milestones:**
- `v0.1.0-prototype-validated` → Issues 2, 3, 4 fixed (current)
- `v0.2.0-production-ready` → B1 complete (quality gates operational)

**Production Milestones:**
- `v1.0.0` → First production release (TDD discipline, full test coverage)

---

**LAST UPDATED:** 2025-11-11
**OWNER:** workspace-architect
**PATTERN:** Prototype preservation + Production hardening strategy
