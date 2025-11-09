/**
 * useScriptComments.test.tsx - Orchestration hook behavioral tests
 *
 * Tests verify:
 * 1. Hook composes shared useComments with app context (useCurrentScript)
 * 2. Script ID flows from context to shared primitive
 * 3. SCRIPTS_WEB_CAPABILITIES configuration applied
 *
 * Pattern: Orchestration testing (verify composition, not reimplementing shared tests)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useScriptComments } from './useScriptComments';

// Mock shared dependencies
vi.mock('@workspace/shared/comments', () => ({
  useComments: vi.fn((_editor, scriptId, capabilities) => ({
    // Return mock interface that proves composition
    scriptId,
    capabilities,
    threads: [],
    isLoading: false,
    error: null,
  })),
  SCRIPTS_WEB_CAPABILITIES: {
    requireAnchors: true,
    enablePositionRecovery: true,
    enableTipTapIntegration: true,
  },
}));

vi.mock('./useCurrentScript', () => ({
  useCurrentScript: vi.fn(() => ({
    currentScript: { id: 'test-script-123' },
    selectedVideo: null,
  })),
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('useScriptComments - Orchestration Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('composes shared useComments with script context', async () => {
    const { result } = renderHook(() => useScriptComments(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Verify orchestration: script ID from context passed to shared hook
      expect(result.current.scriptId).toBe('test-script-123');
    });
  });

  it('passes SCRIPTS_WEB_CAPABILITIES to shared hook', async () => {
    const { useComments } = await import('@workspace/shared/comments');

    renderHook(() => useScriptComments(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Verify useComments was called with capabilities
      expect(useComments).toHaveBeenCalledWith(
        null,
        'test-script-123',
        expect.objectContaining({
          requireAnchors: true,
          enablePositionRecovery: true,
          enableTipTapIntegration: true,
        })
      );
    });
  });

  it('handles null script gracefully', async () => {
    // Mock no script selected
    const { useCurrentScript } = await import('./useCurrentScript');
    vi.mocked(useCurrentScript).mockReturnValue({
      currentScript: null,
      selectedVideo: null,
      save: vi.fn(),
      updateStatus: vi.fn(),
      saveStatus: 'saved',
      setSaveStatus: vi.fn(),
      lastSaved: null,
      componentCount: 0,
      isLoading: false,
      isSaving: false,
      isUpdatingStatus: false,
      error: null,
      userRole: null,
    });

    const { result } = renderHook(() => useScriptComments(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Verify null script handled correctly
      expect(result.current.scriptId).toBeNull();
    });
  });
});
