// Batch Cancellation Tests
// Tests for user ability to cancel in-progress batch operations
// RED PHASE: These tests verify the actual navigation-panel.js implementation

import { describe, it, expect } from 'vitest';

describe('Batch Cancellation - State Flags (RED PHASE)', () => {
  it('PanelState should have batchProcessing flag', async () => {
    // RED: This will fail because navigation-panel.js doesn't have this flag yet
    // We're testing that the actual source code has been modified
    // This test will pass once we add: batchProcessing: false to PanelState (line 22-24)

    // Read the navigation-panel.js source to verify flag exists
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(process.cwd(), 'js/navigation-panel.js');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Check if batchProcessing flag is defined in PanelState initialization
    expect(source).toContain('batchProcessing:');
  });

  it('PanelState should have batchCancelled flag', async () => {
    // RED: This will fail because navigation-panel.js doesn't have this flag yet
    // This test will pass once we add: batchCancelled: false to PanelState

    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(process.cwd(), 'js/navigation-panel.js');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    expect(source).toContain('batchCancelled:');
  });

  it('processNextClip should check batchCancelled flag for early exit', async () => {
    // RED: This will fail - no cancellation check exists in processNextClip yet
    // This test will pass once we add the early exit check

    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(process.cwd(), 'js/navigation-panel.js');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Verify processNextClip function exists
    expect(source).toContain('function processNextClip(index)');

    // Verify cancellation check exists (will fail in RED phase)
    expect(source).toContain('PanelState.batchCancelled');
  });

  it('batchApplyToPremiere should NOT disable button during processing', async () => {
    // RED: Current code sets disabled = true (line 845)
    // After implementation: button stays enabled for cancel action

    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(process.cwd(), 'js/navigation-panel.js');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Extract batchApplyToPremiere function
    const funcMatch = source.match(/batchApplyToPremiere:\s*function\(\)\s*\{[\s\S]*?\n\s{4}\},/);
    expect(funcMatch).toBeTruthy();

    const funcBody = funcMatch[0];

    // RED: This should fail - current code has "disabled = true"
    // GREEN: After fix, button should NOT be disabled (removed or set to false)
    expect(funcBody).not.toContain('this.elements.batchApply.disabled = true');
  });

  it('button text should show cancel option during processing', async () => {
    // RED: Current button text is "Processing..." (no cancel hint)
    // GREEN: Should show "✕ Cancel" text

    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(process.cwd(), 'js/navigation-panel.js');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Extract processNextClip to check button text updates
    const funcMatch = source.match(/function processNextClip\(index\)\s*\{[\s\S]*?\n\s{6}\}/);
    expect(funcMatch).toBeTruthy();

    const funcBody = funcMatch[0];

    // RED: Should fail - current text doesn't include "Cancel"
    // GREEN: After implementation, button text includes cancel hint
    expect(funcBody).toContain('Cancel');
  });

  it('cancellation should preserve selection (not clear like completion)', async () => {
    // RED: Current completion code calls clearSelection() (line 874)
    // GREEN: Cancel path should NOT call clearSelection()

    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(process.cwd(), 'js/navigation-panel.js');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Extract processNextClip function
    const funcMatch = source.match(/function processNextClip\(index\)\s*\{[\s\S]*?\n\s{6}\}/);
    expect(funcMatch).toBeTruthy();

    const funcBody = funcMatch[0];

    // Verify cancellation branch exists (will fail in RED)
    expect(funcBody).toContain('batchCancelled');

    // Cancellation should NOT clear selection
    // (completion path at L874 does clear, but cancel path should preserve)
    const cancelBlock = funcBody.match(/if\s*\(PanelState\.batchCancelled\)\s*\{[\s\S]*?\n\s{8}\}/);
    if (cancelBlock) {
      // In GREEN phase, verify cancel block does NOT call clearSelection
      expect(cancelBlock[0]).not.toContain('clearSelection');
    }
  });
});
