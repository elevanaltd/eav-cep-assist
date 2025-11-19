# ExtendScript Testing Strategy

**Document ID:** 013-DOC-EXTENDSCRIPT-TESTING-STRATEGY
**Created:** 2025-11-19
**Status:** Active
**Scope:** Testing strategy for Adobe ExtendScript layer (jsx/host.jsx)

---

## Executive Summary

The ExtendScript layer (`jsx/host.jsx`, 1,567 lines) is currently **untested** despite being the critical integration point between the CEP panel and Adobe Premiere Pro. This document defines a pragmatic testing strategy that balances:

1. **Automated testing** for pure logic (XML manipulation, data transformation)
2. **Manual testing protocols** for Adobe API integration (XMP read/write, Project Panel operations)
3. **Characterization testing** for regression prevention during refactoring

**Key Constraint:** ExtendScript runs in Adobe's JavaScript engine (ES3, 1999 spec) and requires Premiere Pro runtime environment. Standard Node.js/browser testing tools cannot execute this code natively.

---

## Current State Analysis

### Test Coverage Gap

| **Layer** | **Lines of Code** | **Test Files** | **Tests** | **Coverage** |
|-----------|-------------------|----------------|-----------|--------------|
| CEP Panel (js/) | ~2,500 | 4 | 38 (36 passing) | Partial |
| ExtendScript (jsx/) | 1,567 | 0 | 0 | **0%** |

**Risk Assessment:**
- **HIGH RISK:** XMP metadata manipulation (lines 253-559) - namespace collisions, regex failures
- **HIGH RISK:** File I/O operations (lines 573-757) - JSON sidecar writes, path handling
- **MEDIUM RISK:** Recursive tree traversal (lines 793-825, 1173-1197) - infinite loops, null pointers
- **MEDIUM RISK:** Data transformation (lines 836-1163) - XMP parsing, metadata extraction

### ExtendScript API Surface

**Public Functions (7):**
1. `getSelectedClips()` → Read Project Panel selection
2. `getAllProjectClips()` → Load all clips with XMP metadata
3. `updateClipMetadata()` → Write XMP + JSON sidecar files
4. `selectClip()` → Select clip in Project Panel
5. `openInSourceMonitor()` → Open clip in Source Monitor
6. `exportFrameAtTime()` → Export video frame at specific timestamp
7. `parseStructuredNaming()` → Extract ID from filename

**Internal Helpers (5):**
- `escapeXML()` → XML entity escaping (security-critical)
- `findProjectItemByNodeId()` → Recursive tree search
- `collectClipsRecursive()` → Recursive clip collection
- `_logToFile()` → Debug logging (file I/O)
- XMP namespace block manipulation (Dublin Core, xmpDM)

---

## Testing Strategy Framework

### Tier 1: Automated Unit Tests (Pure Logic)

**Target Functions:**
- `escapeXML()` - XML entity escaping
- `parseStructuredNaming()` - Filename parsing
- XMP regex extraction logic (can be isolated)

**Approach:**
1. Extract pure functions into testable modules (no Adobe API dependencies)
2. Use Vitest with ES3-compatible transpilation
3. Mock Adobe globals (app, ProjectItemType) with synthetic fixtures

**Example Test Structure:**
```javascript
// test/unit/extendscript/xml-escape.test.js
import { describe, it, expect } from 'vitest';
import { escapeXML } from '../../../jsx/host.jsx'; // If extractable

describe('escapeXML()', () => {
  it('should escape XML entities', () => {
    expect(escapeXML('&<>"\'test')).toBe('&amp;&lt;&gt;&quot;&apos;test');
  });

  it('should handle empty strings', () => {
    expect(escapeXML('')).toBe('');
  });

  it('should prevent XSS injection', () => {
    const malicious = '<script>alert("XSS")</script>';
    const escaped = escapeXML(malicious);
    expect(escaped).not.toContain('<script>');
  });
});
```

**Coverage Target:** 30% (pure logic functions only)

**Feasibility:** **MODERATE** - Requires refactoring to extract pure functions from Adobe API context.

---

### Tier 2: Integration Tests with Mocked Adobe API

**Target Functions:**
- `findProjectItemByNodeId()` - Recursive search with synthetic tree
- `collectClipsRecursive()` - Clip collection with mocked project structure
- `getAllProjectClips()` - XMP parsing with synthetic XMP fixtures

**Approach:**
1. Create synthetic Adobe API mocks (ProjectItem, XMP strings)
2. Use real XMP test fixtures from production files
3. Test XMP regex extraction without actual Premiere Pro

**Example Test Structure:**
```javascript
// test/integration/extendscript/xmp-parsing.test.js
import { describe, it, expect } from 'vitest';

describe('XMP Metadata Parsing', () => {
  it('should extract dc:description from XMP', () => {
    const xmpFixture = `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
               xmlns:dc="http://purl.org/dc/elements/1.1/">
        <rdf:Description rdf:about="">
          <dc:description>
            <rdf:Alt>
              <rdf:li xml:lang="x-default">kitchen, oven, appliances</rdf:li>
            </rdf:Alt>
          </dc:description>
        </rdf:Description>
      </rdf:RDF>
    `;

    // Test regex from getAllProjectClips()
    const descMatch = xmpFixture.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>(.*?)<\/rdf:li>/);
    expect(descMatch[1]).toBe('kitchen, oven, appliances');
  });

  it('should extract xmpDm:LogComment structured data', () => {
    const xmpFixture = `
      <rdf:Description xmlns:xmpDM="http://ns.adobe.com/xmp/1.0/DynamicMedia/">
        <xmpDM:LogComment>location=kitchen, subject=oven, action=cleaning, shotType=CU</xmpDM:LogComment>
      </rdf:Description>
    `;

    const logCommentMatch = xmpFixture.match(/<xmpDM:LogComment>(.*?)<\/xmpDM:LogComment>/);
    const logComment = logCommentMatch[1];

    const locationMatch = logComment.match(/location=([^,]*)/);
    expect(locationMatch[1].trim()).toBe('kitchen');
  });

  it('should handle missing XMP fields gracefully', () => {
    const emptyXmp = '<rdf:RDF></rdf:RDF>';
    const descMatch = emptyXmp.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>(.*?)<\/rdf:li>/);
    expect(descMatch).toBeNull();
  });
});
```

**Coverage Target:** 50% (XMP parsing, data transformation logic)

**Feasibility:** **HIGH** - Can be implemented immediately with XMP fixtures from production files.

---

### Tier 3: Manual Test Protocol (Adobe API Integration)

**Functions Requiring Premiere Pro:**
- `getSelectedClips()` - Requires actual Project Panel selection
- `updateClipMetadata()` - Requires XMP write + validation
- `selectClip()` - Requires Project Panel interaction
- `openInSourceMonitor()` - Requires Source Monitor window
- `exportFrameAtTime()` - Requires encoder API

**Manual Test Protocol (XMP Round-Trip)**

#### Test Case 1: XMP Write + Read Validation

**Objective:** Verify XMP metadata persists correctly through write/read cycle.

**Prerequisites:**
- Premiere Pro with test project open
- Test clip: `EA001601.MOV` imported
- CEP Panel deployed and loaded

**Steps:**
1. **Open Navigation Panel** → Window → Extensions → EAV Navigation
2. **Open Metadata Panel** → Window → Extensions → EAV Metadata
3. **Select test clip** → Click `EA001601.MOV` in Navigation Panel
4. **Verify fields clear** → All form fields should be empty initially
5. **Fill metadata fields:**
   - Identifier: `EA001601`
   - Description: `kitchen, oven, appliances`
   - Location: `kitchen`
   - Subject: `oven`
   - Action: `cleaning`
   - Shot Type: `CU`
6. **Apply to Premiere** → Click "Apply to Premiere" button
7. **Wait for green checkmark** → Success indicator appears (2-3 seconds)
8. **Verify ExtendScript console:**
   - Open: Premiere Pro → Help → Console (Cmd+F12)
   - Check for: `DEBUG SAVE: dc:description updated`
   - Check for: `DEBUG SAVE: xmpDM:LogComment updated`
9. **Click different clip** → Select `EA001602.MOV`
10. **Verify fields clear** → All fields should empty
11. **Re-select original clip** → Click `EA001601.MOV` again
12. **VERIFY PERSISTENCE** → All fields should reload with EXACT values:
    - Identifier: `EA001601`
    - Description: `kitchen, oven, appliances`
    - Location: `kitchen`
    - Subject: `oven`
    - Action: `cleaning`
    - Shot Type: `CU`

**Expected Results:**
- ✅ All fields persist correctly
- ✅ ExtendScript console shows successful XMP writes
- ✅ No errors in Metadata Panel console (right-click → Debug)

**Failure Modes:**
- ❌ Description is empty → Dublin Core namespace issue
- ❌ Location/Subject corrupted → xmpDM namespace collision
- ❌ Fields don't reload → XMP read failure
- ❌ Error in console → XMP malformation

**Debug Commands:**
```javascript
// In Metadata Panel console (right-click → Debug)
// Check raw XMP string
csInterface.evalScript('EAVIngest.getSelectedClips()', function(result) {
  console.log(JSON.parse(result));
});
```

#### Test Case 2: JSON Sidecar File Write

**Objective:** Verify PP edits JSON is written to original media folder.

**Prerequisites:**
- Test clip with known media path (e.g., `/Volumes/EAV_Video_RAW/.../EA001932.MOV`)
- Write permissions to media folder

**Steps:**
1. **Follow Test Case 1** (fill metadata + apply)
2. **Open Terminal** → Navigate to media folder
3. **Verify file exists:**
   ```bash
   ls -la /Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/.ingest-metadata-pp.json
   ```
4. **Validate JSON structure:**
   ```bash
   cat .ingest-metadata-pp.json | jq .
   ```
5. **Check for expected fields:**
   - `_schema`: `"2.0"`
   - `EA001932.location`: `"kitchen"`
   - `EA001932.modifiedBy`: `"cep-panel"`

**Expected Results:**
- ✅ JSON file created in correct location
- ✅ Valid JSON structure (no parse errors)
- ✅ All metadata fields present
- ✅ Audit trail fields populated (modifiedAt, modifiedBy)

**Failure Modes:**
- ❌ File not created → Check ExtendScript console for path errors
- ❌ Invalid JSON → Check for escaping issues (quotes, backslashes)
- ❌ Missing fields → Check metadata object construction

#### Test Case 3: XMP Namespace Isolation

**Objective:** Verify Dublin Core and xmpDm fields don't collide.

**Prerequisites:**
- Test clip with EMPTY XMP metadata (fresh import)

**Steps:**
1. **Select empty clip** → No existing metadata
2. **Fill ONLY Description** → `"test, keywords"`
3. **Apply** → Wait for success
4. **Verify ExtendScript console:**
   - Look for: `dc:description FOUND, replacing...` OR `dc:description NOT FOUND, appending...`
5. **Fill Location/Subject/Action/ShotType** → Complete all fields
6. **Apply** → Wait for success
7. **Verify ExtendScript console:**
   - Look for: `xmpDM:LogComment NOT FOUND, appending...`
8. **Re-select clip** → Verify ALL fields reload correctly
9. **Check console for namespace blocks:**
   - Should see TWO separate `<rdf:Description>` blocks (Dublin Core + xmpDM)

**Expected Results:**
- ✅ Dublin Core fields (description) in separate namespace block
- ✅ xmpDm fields (LogComment) in separate namespace block
- ✅ No field corruption or overwriting

**Failure Modes:**
- ❌ Fields overwrite each other → Namespace collision (all fields inserted into first `</rdf:Description>`)
- ❌ Regex fails to match → Check for whitespace/attribute order variations

---

### Test Execution Frequency

| **Test Type** | **Frequency** | **Trigger** |
|---------------|---------------|-------------|
| Automated Unit | Every commit | CI pipeline (npm test) |
| Automated Integration | Every commit | CI pipeline (npm test) |
| Manual XMP Round-Trip | Weekly | After ExtendScript changes |
| Manual Full Regression | Before release | Pre-deployment checklist |

---

## Test Infrastructure Setup

### Vitest Configuration for ExtendScript

**File:** `vitest.config.extendscript.js`

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'extendscript',
    include: ['test/unit/extendscript/**/*.test.js', 'test/integration/extendscript/**/*.test.js'],
    environment: 'node', // ExtendScript mocks don't need jsdom
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['jsx/**/*.jsx'],
      exclude: ['jsx/test-es3-*.jsx'], // Exclude validation test files
      reporter: ['text', 'json', 'html'],
      lines: 30, // Target 30% for phase 1
      functions: 30,
      branches: 25,
      statements: 30
    }
  }
});
```

### Adobe API Mock Library

**File:** `test/mocks/adobe-api.js`

```javascript
// Mock Adobe Premiere Pro API objects for unit testing
// These are SYNTHETIC fixtures - do NOT use for production logic

export const ProjectItemType = {
  CLIP: 1,
  BIN: 2,
  FILE: 3
};

export class MockProjectItem {
  constructor(config = {}) {
    this.nodeId = config.nodeId || 'mock-node-id';
    this.name = config.name || 'test-clip.mov';
    this.treePath = config.treePath || '\\Project.prproj\\test-bin\\test-clip.mov';
    this.type = config.type || ProjectItemType.CLIP;
    this.children = config.children || { numItems: 0 };
    this._xmpMetadata = config.xmpMetadata || '<rdf:RDF></rdf:RDF>';
  }

  getMediaPath() {
    return this.mediaPath || '/path/to/' + this.name;
  }

  getXMPMetadata() {
    return this._xmpMetadata;
  }

  setXMPMetadata(xmpString) {
    this._xmpMetadata = xmpString;
  }

  getProjectColumnsMetadata() {
    return {
      Tape: this.tapeName || '',
      Description: this.description || '',
      Shot: this.shot || ''
    };
  }

  select() {
    // Mock selection (no-op for tests)
  }
}

export class MockProject {
  constructor(rootItem) {
    this.rootItem = rootItem || new MockProjectItem({ type: ProjectItemType.BIN });
    this._selection = [];
  }

  getSelection() {
    return this._selection;
  }

  setSelection(items) {
    this._selection = items;
  }
}

export const mockApp = {
  project: null,
  sourceMonitor: {
    openProjectItem: function(item) {
      // Mock opening in source monitor
    }
  }
};

// Synthetic XMP fixtures for testing
export const XMP_FIXTURES = {
  EMPTY: '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>',

  WITH_DC_DESCRIPTION: `
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:description>
          <rdf:Alt>
            <rdf:li xml:lang="x-default">kitchen, oven, appliances</rdf:li>
          </rdf:Alt>
        </dc:description>
      </rdf:Description>
    </rdf:RDF>
  `,

  WITH_XMPDM_LOGCOMMENT: `
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about="" xmlns:xmpDM="http://ns.adobe.com/xmp/1.0/DynamicMedia/">
        <xmpDM:LogComment>location=kitchen, subject=oven, action=cleaning, shotType=CU</xmpDM:LogComment>
      </rdf:Description>
    </rdf:RDF>
  `,

  FULL_METADATA: `
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:description>
          <rdf:Alt>
            <rdf:li xml:lang="x-default">kitchen, oven, appliances</rdf:li>
          </rdf:Alt>
        </dc:description>
        <dc:identifier>EA001601</dc:identifier>
      </rdf:Description>
      <rdf:Description rdf:about="" xmlns:xmpDM="http://ns.adobe.com/xmp/1.0/DynamicMedia/">
        <xmpDM:shotName>kitchen-oven-cleaning-CU</xmpDM:shotName>
        <xmpDM:LogComment>location=kitchen, subject=oven, action=cleaning, shotType=CU</xmpDM:LogComment>
      </rdf:Description>
    </rdf:RDF>
  `
};
```

---

## Success Criteria

### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**
- ✅ Automated unit tests for `escapeXML()` and `parseStructuredNaming()`
- ✅ Integration tests for XMP regex extraction (5+ test cases)
- ✅ Adobe API mock library (`test/mocks/adobe-api.js`)
- ✅ Manual test protocol documented (this document)
- ✅ First manual test run completed + results logged

**Metrics:**
- 30% automated test coverage (XMP parsing logic)
- 0 test failures in CI pipeline
- Manual protocol completed in < 30 minutes

### Phase 2: Characterization Tests (Weeks 3-4)

**Deliverables:**
- ✅ Characterization tests for XMP namespace manipulation
- ✅ Regression test suite (golden XMP outputs)
- ✅ JSON sidecar write validation tests

**Metrics:**
- 50% automated test coverage
- 10+ characterization tests (XMP round-trip scenarios)
- Manual protocol expanded to cover JSON validation

### Phase 3: Continuous Quality (Ongoing)

**Deliverables:**
- ✅ Pre-deployment manual checklist integrated
- ✅ Weekly manual test runs (logged in `.coord/test-logs/`)
- ✅ ExtendScript refactoring to extract testable pure functions

**Metrics:**
- 60%+ automated test coverage
- < 1 hour manual regression testing
- 0 critical XMP bugs in production

---

## Long-Term Automation Opportunities

### 1. ExtendScript Test Runner (Custom Tool)

**Concept:** Build a lightweight test harness that runs INSIDE Premiere Pro's ExtendScript engine.

**Approach:**
- Create `jsx/test-runner.jsx` with assertion helpers
- Load test specs via `$.evalFile()`
- Report results to file or CEP panel

**Example:**
```javascript
// jsx/test-runner.jsx
function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}

function testEscapeXML() {
  var result = escapeXML('&<>"\'test');
  assert(result === '&amp;&lt;&gt;&quot;&apos;test', 'XML entities not escaped');
}

// Run all tests
try {
  testEscapeXML();
  $.writeln('✓ All tests passed');
} catch (e) {
  $.writeln('✗ Test failed: ' + e.message);
}
```

**Feasibility:** MODERATE - Requires custom tooling but provides native execution environment.

**Timeline:** 6-12 months (low priority, use manual protocol first)

---

### 2. Headless Premiere Pro Testing (Advanced)

**Concept:** Automate Premiere Pro via command-line + ExtendScript for CI integration.

**Approach:**
- Use Adobe's headless rendering API (if available)
- Script Premiere Pro launch + test execution
- Capture console output for CI reporting

**Challenges:**
- Requires Premiere Pro license on CI server
- Limited headless support in Adobe ecosystem
- Complex CI setup (macOS/Windows agents)

**Feasibility:** LOW - Not officially supported by Adobe, high maintenance overhead.

**Timeline:** 12+ months (exploratory research only)

---

### 3. XMP Schema Validator (Standalone Tool)

**Concept:** Extract XMP manipulation logic into standalone library with comprehensive test coverage.

**Approach:**
- Create `lib/xmp-validator.js` (ES3-compatible)
- Test in isolation with Node.js
- Import into ExtendScript via `$.evalFile()`

**Benefits:**
- Full test coverage in standard environment
- Reusable across projects
- CI integration without Premiere Pro

**Feasibility:** HIGH - Aligns with extraction-first philosophy.

**Timeline:** 3-6 months (after Phase 2 characterization tests prove patterns)

---

## Risks and Mitigations

| **Risk** | **Impact** | **Likelihood** | **Mitigation** |
|----------|------------|----------------|----------------|
| **XMP corruption in production** | HIGH (metadata loss) | MEDIUM | Manual test protocol REQUIRED before every deployment |
| **Regression during refactoring** | HIGH (broken workflows) | HIGH | Characterization tests capture current behavior before changes |
| **Adobe API changes** | MEDIUM (version incompatibility) | LOW | Version-specific test fixtures + manual validation |
| **Test maintenance burden** | MEDIUM (slow iteration) | MEDIUM | Focus on high-risk areas (XMP write), accept gaps in low-risk functions |
| **CI test flakiness** | LOW (false failures) | LOW | Use deterministic fixtures, avoid file I/O in unit tests |

---

## References

### Internal Documentation
- **CLAUDE.md** → Production workflow, debug console access, XMP namespace bug history
- **003-DOC-TEST-SPEC-LOGCOMMENT-ATTRIBUTE-PARSING.md** → XMP parsing validation requirements
- **002-DOC-ML-FEEDBACK-LOOP.md** → JSON sidecar file specification
- **test/unit/navigation-bin-collapse.test.js** → Exemplary CEP layer test patterns

### External Resources
- **Adobe ExtendScript Toolkit** → Official debugging environment
- **XMP Specification** → https://www.adobe.com/devnet/xmp.html
- **CEP Developer Guide** → https://github.com/Adobe-CEP/CEP-Resources

---

## Appendix A: Test File Structure

```
test/
├── unit/
│   ├── extendscript/
│   │   ├── xml-escape.test.js          # Pure function tests
│   │   ├── filename-parsing.test.js    # Pure function tests
│   │   └── recursive-search.test.js    # Tree traversal with mocks
│   └── navigation-bin-collapse.test.js # Existing CEP tests
├── integration/
│   ├── extendscript/
│   │   ├── xmp-parsing.test.js         # XMP regex validation
│   │   ├── xmp-namespace-isolation.test.js # Dublin Core vs xmpDm
│   │   └── json-sidecar-format.test.js # PP edits JSON structure
│   ├── cep-events.test.js              # Existing CEP tests
│   └── qe-dom-payloads.test.js         # Existing CEP tests
├── manual/
│   └── xmp-round-trip.md               # Manual test protocol (copy of this doc)
├── mocks/
│   ├── adobe-api.js                    # ProjectItem, app, etc.
│   └── xmp-fixtures.js                 # Real XMP samples from production
└── fixtures/
    └── test-clips/
        ├── EA001601.xmp                # Real XMP metadata files
        └── EA001602.xmp
```

---

## Appendix B: Quality Gate Integration

**File:** `package.json` (updated scripts)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:extendscript": "vitest run --config vitest.config.extendscript.js",
    "test:cep": "vitest run --config vitest.config.js",
    "test:manual": "echo 'Run manual protocol: .coord/docs/013-DOC-EXTENDSCRIPT-TESTING-STRATEGY.md'",
    "quality-gates": "npm run lint && npm run validate:es3 && npm run typecheck && npm run test:cep && npm run test:extendscript"
  }
}
```

**CI Pipeline Update (GitHub Actions):**

```yaml
# .github/workflows/quality-gates.yml
- name: Run ExtendScript Tests
  run: npm run test:extendscript

- name: Check Test Coverage
  run: |
    npm run test:extendscript -- --coverage
    # Fail if coverage drops below 30%
    cat coverage/coverage-summary.json | jq '.total.lines.pct' | awk '{if ($1 < 30) exit 1}'
```

---

## Document History

| **Version** | **Date** | **Author** | **Changes** |
|-------------|----------|------------|-------------|
| 1.0 | 2025-11-19 | test-infrastructure-steward | Initial testing strategy |

---

**Next Steps:**
1. Review this document with holistic-orchestrator
2. Create initial test infrastructure (mocks, fixtures)
3. Implement Phase 1 unit tests (escapeXML, parseStructuredNaming)
4. Execute first manual test run and log results
5. Refine strategy based on learnings
