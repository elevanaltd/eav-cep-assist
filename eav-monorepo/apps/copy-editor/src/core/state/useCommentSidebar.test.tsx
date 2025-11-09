/**
 * useCommentSidebar.test.tsx - Sidebar orchestration hook behavioral tests
 *
 * Tests verify:
 * 1. Hook composes shared comment primitives (useCommentsQuery, useCommentMutations)
 * 2. Sidebar UI state managed (filter mode, form states)
 * 3. Realtime subscription for connection resilience
 *
 * Pattern: Orchestration testing (verify composition + sidebar-specific state)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCommentSidebar } from './useCommentSidebar';

// Mock shared dependencies
vi.mock('@workspace/shared/comments', () => ({
  useCommentsQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useCommentMutations: vi.fn(() => ({
    resolveMutation: { mutate: vi.fn() },
    unresolveMutation: { mutate: vi.fn() },
    deleteMutation: { mutate: vi.fn() },
  })),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  clearUserProfileCache: vi.fn(),
  SCRIPTS_WEB_CAPABILITIES: {
    requireAnchors: true,
    enablePositionRecovery: true,
    enableTipTapIntegration: true,
  },
}));

vi.mock('@workspace/shared/auth', () => ({
  useAuth: vi.fn(() => ({
    userProfile: { id: 'test-user', email: 'test@example.com' },
  })),
}));

vi.mock('@workspace/shared/services', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase for realtime
vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    })),
  },
}));

// Mock error handling
vi.mock('../../utils/errorHandling', () => ({
  useErrorHandling: vi.fn(() => ({
    executeWithErrorHandling: vi.fn(async (fn) => {
      try {
        const data = await fn();
        return { success: true, data };
      } catch (error) {
        return { success: false, error };
      }
    }),
  })),
  getUserFriendlyErrorMessage: vi.fn((error) => error.message),
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

describe('useCommentSidebar - Orchestration Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('composes shared comment queries and mutations', async () => {
    const { result } = renderHook(
      () =>
        useCommentSidebar({
          scriptId: 'test-script',
          createComment: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Verify shared primitives composed
      expect(result.current.threads).toBeDefined();
      expect(result.current.loading).toBe(false);
    });
  });

  it('provides sidebar UI state (filter mode)', async () => {
    const { result } = renderHook(
      () =>
        useCommentSidebar({
          scriptId: 'test-script',
          createComment: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Verify sidebar-specific state
      expect(result.current.filterMode).toBe('all');
      expect(result.current.setFilterMode).toBeInstanceOf(Function);
    });
  });

  it('provides comment form state and handlers', async () => {
    const { result } = renderHook(
      () =>
        useCommentSidebar({
          scriptId: 'test-script',
          createComment: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Verify form orchestration
      expect(result.current.commentText).toBe('');
      expect(result.current.setCommentText).toBeInstanceOf(Function);
      expect(result.current.handleCreateComment).toBeInstanceOf(Function);
      expect(result.current.handleCancelComment).toBeInstanceOf(Function);
    });
  });

  it('provides connection status from realtime subscription', async () => {
    const { result } = renderHook(
      () =>
        useCommentSidebar({
          scriptId: 'test-script',
          createComment: null,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Verify realtime orchestration
      expect(result.current.connectionStatus).toBe('connected');
    });
  });
});
