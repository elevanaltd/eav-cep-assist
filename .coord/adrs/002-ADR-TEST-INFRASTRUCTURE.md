# ADR-002: Test Infrastructure for CEP Extensions

**Status:** Accepted
**Date:** 2025-11-11
**Decision Makers:** workspace-architect
**Consulted:** ADR-001 (Prototype→Production Transition), test-infrastructure-steward patterns

---

## Context

CEP (Common Extensibility Platform) extensions have unique testing challenges:
- **Two Execution Contexts:** CEP panels (Chromium/modern JS) + ExtendScript (ES3/Premiere Pro)
- **Adobe APIs Required:** XMP write, Project Panel interaction require Premiere Pro running
- **Limited Tooling:** ExtendScript is ES3 (no TypeScript, no modern test frameworks in host)
- **Event System:** CEP panels communicate via CSInterface events (needs mocking)

**Decision Point:** Which test framework and testing strategy fits CEP extension constraints?

---

## Decision

**Adopt a THREE-TIER testing strategy with Vitest as primary framework:**

### Tier 1: Unit Tests (Automated - Vitest)
**Scope:** Pure JavaScript functions (no CEP/ExtendScript dependencies)
**Examples:** `generateClipName()`, `validateMetadata()`, `parseXMP()`
**Execution:** CI/CD (GitHub Actions)
**Coverage Target:** >80% for business logic functions

### Tier 2: Integration Tests (Automated with Mocks - Vitest)
**Scope:** CEP event system, form state, ExtendScript calls (mocked)
**Examples:** Navigation→Metadata event dispatch, form load/save cycle
**Execution:** CI/CD (GitHub Actions)
**Coverage Target:** >60% for component interactions

### Tier 3: Characterization Tests (Manual - Documented)
**Scope:** XMP write, Premiere Pro API interactions, end-to-end workflows
**Examples:** Save metadata→reload→verify persistence
**Execution:** Manual (requires Premiere Pro running)
**Documentation:** `test/manual/CHARACTERIZATION-TESTS.md`

**Test Framework:** **Vitest** (primary) + **Playwright** (future: E2E automation exploration)

---

## Rationale

### Option 1: Mocha + Chai (REJECTED)
**Approach:** Traditional Node.js test framework
**Pros:**
- Mature ecosystem
- Well-documented
- Wide adoption

**Cons:**
- Slower execution (no Vite build caching)
- More boilerplate (separate assertion library)
- No built-in browser API mocking

**Why Rejected:** Vitest provides better developer experience with similar capabilities

---

### Option 2: Jest (REJECTED)
**Approach:** Popular React/Node.js test framework
**Pros:**
- Built-in mocking
- Good browser API support
- Large ecosystem

**Cons:**
- Slow execution (heavy transform pipeline)
- Complex configuration for ES modules
- Not optimized for Vite projects

**Why Rejected:** Vitest is "Jest-compatible" but faster and Vite-native

---

### Option 3: Vitest + Playwright (ACCEPTED)
**Approach:** Vitest for unit/integration, Playwright for future E2E exploration
**Pros:**
- **Fast:** Vite-native (instant HMR, parallel execution)
- **Modern:** ESM support, TypeScript out-of-box (if we add later)
- **Compatible:** Jest-like API (easy migration if needed)
- **Mocking:** Built-in mocking (`vi.mock()`, `vi.fn()`)
- **Browser APIs:** Built-in support (DOM, localStorage, etc.)
- **Coverage:** c8 integration (fast, accurate)

**Cons:**
- Newer ecosystem (less mature than Jest/Mocha)
- Requires Vite understanding (learning curve)

**Synthesis:**
- **VISION:** Fast, modern test infrastructure
- **CONSTRAINT:** CEP testing limitations (manual tests required)
- **STRUCTURE:** Three-tier strategy (unit→integration→manual)
- **REALITY:** Cannot fully automate Adobe API interactions
- **JUDGEMENT:** Pragmatic mix (automate what we can, document what we can't)
- **MASTERY:** Vitest provides developer experience excellence

**Third-Way Solution:**
Instead of choosing "full automation" OR "all manual tests," we create a **TIERED STRATEGY** where we automate pure logic (unit/integration) and document complex interactions (characterization). Vitest optimizes the automated tier, while manual test docs ensure critical paths stay protected.

---

## Implementation Plan

### 1. Install Vitest
```bash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8
```

### 2. Configure Vitest (`vitest.config.js`)
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,           // No need to import describe/it/expect
    environment: 'jsdom',    // Browser environment (DOM APIs)
    setupFiles: ['./test/helpers/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['js/**/*.js'],
      exclude: ['js/CSInterface.js', 'jsx/**/*.jsx'],  // Exclude vendor + ExtendScript
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
});
```

### 3. Create Test Directory Structure
```
test/
  unit/                     # Pure JavaScript functions
    metadata.test.js        # generateClipName(), validateMetadata()
    utils.test.js           # Helper functions
  integration/              # Component interactions (mocked ExtendScript)
    cep-events.test.js      # Navigation→Metadata event system
    metadata-form.test.js   # Form load/save cycle
    navigation-panel.test.js # Clip filtering, sorting
  fixtures/                 # Test data
    mock-clips.json         # Sample clip data
    mock-xmp.xml            # Sample XMP metadata
  helpers/                  # Test utilities
    setup.js                # Global test setup
    mock-csinterface.js     # Mock CSInterface for CEP tests
    mock-extendscript.js    # Mock ExtendScript responses
  manual/                   # Manual test documentation
    CHARACTERIZATION-TESTS.md  # XMP write, PP API tests
    QA-CHECKLIST.md         # Visual UI testing checklist
```

### 4. Create Mock CSInterface (`test/helpers/mock-csinterface.js`)
```javascript
// Mock CSInterface for CEP tests (no Premiere Pro required)
export class MockCSInterface {
  constructor() {
    this.eventListeners = {};
    this.evalScriptResponses = {};
  }

  // Mock evalScript (calls to ExtendScript)
  evalScript(script, callback) {
    const response = this.evalScriptResponses[script] || '{}';
    if (callback) {
      setTimeout(() => callback(response), 0);
    }
  }

  // Mock event dispatch
  dispatchEvent(event) {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => listener(event));
  }

  // Mock event listener
  addEventListener(type, listener) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  // Test helper: Set mock response for evalScript
  setEvalScriptResponse(script, response) {
    this.evalScriptResponses[script] = response;
  }
}
```

### 5. Example Unit Test (`test/unit/metadata.test.js`)
```javascript
import { describe, it, expect } from 'vitest';
import { generateClipName, validateMetadata } from '../../js/metadata-panel.js';

describe('generateClipName', () => {
  it('should generate structured name from metadata', () => {
    const metadata = {
      location: 'kitchen',
      subject: 'oven',
      action: 'cleaning',
      shotType: 'CU'
    };

    const name = generateClipName(metadata);
    expect(name).toBe('kitchen-oven-cleaning-CU');
  });

  it('should handle missing fields gracefully', () => {
    const metadata = {
      location: 'kitchen',
      subject: '',
      action: 'cleaning',
      shotType: 'CU'
    };

    const name = generateClipName(metadata);
    expect(name).toBe('kitchen-cleaning-CU');
  });

  it('should return "Untitled" if all fields empty', () => {
    const metadata = {
      location: '',
      subject: '',
      action: '',
      shotType: ''
    };

    const name = generateClipName(metadata);
    expect(name).toBe('Untitled');
  });
});

describe('validateMetadata', () => {
  it('should pass validation with required fields', () => {
    const metadata = {
      location: 'kitchen',
      subject: 'oven'
    };

    const result = validateMetadata(metadata);
    expect(result.valid).toBe(true);
  });

  it('should fail validation if location and subject both empty', () => {
    const metadata = {
      location: '',
      subject: ''
    };

    const result = validateMetadata(metadata);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Location or Subject');
  });
});
```

### 6. Example Integration Test (`test/integration/cep-events.test.js`)
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockCSInterface } from '../helpers/mock-csinterface.js';

describe('CEP Event Communication', () => {
  let csInterface;

  beforeEach(() => {
    csInterface = new MockCSInterface();
    // Inject mock into global scope (simulates CEP environment)
    global.csInterface = csInterface;
  });

  it('should dispatch clip selection event from Navigation Panel', () => {
    const mockClip = { nodeId: '123', name: 'Test Clip' };
    const dispatchSpy = vi.spyOn(csInterface, 'dispatchEvent');

    // Simulate Navigation Panel click
    // (Assumes NavigationPanel.handleClipClick uses global csInterface)
    NavigationPanel.handleClipClick(mockClip);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'com.eav.clipSelected',
        data: JSON.stringify(mockClip)
      })
    );
  });

  it('should load clip in Metadata Panel when event received', () => {
    const mockClip = { nodeId: '123', name: 'Test Clip' };
    let receivedClip;

    // Simulate Metadata Panel event listener
    csInterface.addEventListener('com.eav.clipSelected', (event) => {
      receivedClip = JSON.parse(event.data);
    });

    // Dispatch event (simulates Navigation Panel action)
    csInterface.dispatchEvent({
      type: 'com.eav.clipSelected',
      data: JSON.stringify(mockClip)
    });

    expect(receivedClip).toEqual(mockClip);
  });
});
```

### 7. Update `package.json` Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint js/*.js",
    "typecheck": "tsc --noEmit",
    "quality-gates": "npm run lint && npm run typecheck && npm test"
  }
}
```

---

## Testing Strategy by Component

### CEP Panels (`js/metadata-panel.js`, `js/navigation-panel.js`)
**Unit Tests:**
- Pure functions: `generateClipName()`, `validateMetadata()`, `parseXMP()`
- Data transformations: `formatClipData()`, `groupClipsByShoot()`

**Integration Tests:**
- Event system: Navigation→Metadata communication
- Form state: Load clip→edit→save cycle (mocked ExtendScript)
- Filtering/sorting: Navigation panel clip list

**Manual Tests:**
- Visual UI (layout, responsiveness)
- Performance (100+ clips)

### ExtendScript (`jsx/host.jsx`)
**Unit Tests:** None (ES3 limitations, no test runner in Premiere Pro)

**Integration Tests:** Mock ExtendScript responses in CEP tests
```javascript
// Mock ExtendScript response for getAllProjectClips()
csInterface.setEvalScriptResponse(
  'EAVIngest.getAllProjectClips()',
  JSON.stringify({ clips: mockClips })
);
```

**Manual Tests (Characterization):**
- XMP namespace-aware write (critical path - Issue #4 fix)
- Project Panel interaction
- Source Monitor open

### CSS/HTML (`css/*.css`, `index-*.html`)
**Unit Tests:** None (visual testing)

**Manual Tests:**
- Layout verification (two-panel grid)
- Responsive behavior
- Accessibility (keyboard navigation, screen readers)

---

## Characterization Test Documentation

**File:** `test/manual/CHARACTERIZATION-TESTS.md`

### XMP Namespace-Aware Write (Critical Path)
**Why Critical:** Issue #4 (XMP namespace corruption) recently fixed
**Risk:** HIGH (metadata corruption if broken)

**Test Procedure:**
1. Open Premiere Pro with test project
2. Select clip `EA001601.MOV`
3. Fill metadata form:
   - Identifier: `EA001601.MOV`
   - Description: `kitchen, spur-switch, appliances`
   - Location: `kitchen`
   - Subject: `spur-switch`
   - Action: `opening`
   - Shot Type: `ESTAB`
4. Click "Apply to Premiere" → Wait for green checkmark
5. Click DIFFERENT clip (clear form)
6. Click `EA001601.MOV` again (reload)
7. Verify ALL fields persist with exact values
8. Open ExtendScript console (Premiere Pro → Help → Console)
9. Verify namespace separation:
   - `dc:description updated`
   - `xmp:Location updated` (not overwriting Subject)
   - `xmp:Subject updated` (not overwriting Location)

**Pass Criteria:**
- ✅ All fields persist after reload
- ✅ Description shows comma-separated values
- ✅ Location and Subject do NOT overwrite each other
- ✅ ExtendScript console shows correct namespace updates

**Failure Mode:**
- ❌ Description empty after reload (Dublin Core block not created)
- ❌ Location/Subject corrupted (XMP namespace collision)

---

## CI/CD Integration (GitHub Actions)

**File:** `.github/workflows/quality-gates.yml`

```yaml
name: Quality Gates

on:
  push:
    branches: [main, feat/**]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/
```

**Note:** Manual characterization tests documented but NOT run in CI (require Premiere Pro).

---

## Consequences

### Positive
✅ **Fast Execution:** Vitest parallel execution, Vite caching
✅ **Modern DX:** Hot reload, UI mode, built-in coverage
✅ **Pragmatic:** Automate unit/integration, document manual tests
✅ **Mocking:** Easy to mock CSInterface, ExtendScript responses
✅ **CI/CD Ready:** Run automated tests on every commit

### Negative
⚠️ **Learning Curve:** Vitest newer than Jest/Mocha (less Stack Overflow)
⚠️ **Manual Tests:** XMP write cannot be fully automated
⚠️ **Coverage Gaps:** ExtendScript (`jsx/host.jsx`) not covered by automated tests
⚠️ **Vite Dependency:** Requires understanding Vite build system

### Risks & Mitigations

**Risk:** Vitest ecosystem maturity (newer than Jest)
**Mitigation:** Jest-compatible API (easy migration if needed)

**Risk:** Manual tests skipped/forgotten
**Mitigation:** Document in `test/manual/CHARACTERIZATION-TESTS.md`, require code review sign-off

**Risk:** Mocked ExtendScript diverges from real behavior
**Mitigation:** Regular manual testing with Premiere Pro, update mocks when bugs found

---

## Future Exploration: Playwright for E2E

**Status:** DEFERRED to B2+
**Goal:** Automate CEP panel UI testing (click, form fill, validation)

**Why Playwright:**
- Browser automation (CEP panels run in Chromium)
- Can simulate CEP environment (inject mock CSInterface)
- Visual regression testing (screenshot comparison)

**Why Deferred:**
- B1 priority: Unit/integration tests (faster ROI)
- Playwright adds complexity (new tool, steeper learning curve)
- Manual tests sufficient for prototype→production transition

**Revisit When:**
- After B1 complete (quality gates operational)
- If visual regression bugs increase
- If manual testing becomes bottleneck

---

## References

- ADR-001: Prototype→Production Transition Strategy
- Vitest Documentation: https://vitest.dev/
- `/Volumes/HestAI/docs/standards/102-SYSTEM-CODE-QUALITY-ENFORCEMENT-GATES.oct.md`
- Test-Infrastructure Skill: Core patterns for monorepo Vitest setup

---

**LAST UPDATED:** 2025-11-11
**STATUS:** Accepted (implementation in progress)
**NEXT REVIEW:** After B1 complete (evaluate test coverage, identify gaps)
