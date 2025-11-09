/**
 * Global Test Setup
 *
 * Runs before all tests to configure the test environment.
 * Runs cleanup after each test to prevent state leakage.
 * Runs global teardown after all tests to cleanup realtime connections.
 *
 * Pattern extracted from: /Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/test/setup.ts
 * Adapted for: Monorepo with @workspace/shared package
 */

import { expect, afterEach, afterAll, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { resetFactoryIds } from './factories'

/**
 * BroadcastChannel Polyfill for Node Test Environment
 *
 * **Issue**: Node.js BroadcastChannel expects `Event` instances, but Supabase Auth
 * dispatches browser-standard `MessageEvent` instances for cross-tab session synchronization.
 *
 * **Root Cause**: Node's BroadcastChannel implementation rejects MessageEvent:
 *   TypeError: The "event" argument must be an instance of Event. Received an instance of MessageEvent
 *
 * **Solution**: Stub BroadcastChannel with minimal test-compatible implementation.
 * In test environment, cross-tab sync isn't needed - we just need to prevent errors.
 *
 * **Impact**: Prevents test errors when Supabase Auth initializes BroadcastChannel
 * for session state synchronization across browser tabs.
 */
class BroadcastChannelStub extends EventTarget {
  readonly name: string
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    super()
    this.name = name
  }

  postMessage(message: unknown): void {
    // Synthesize MessageEvent to exercise broadcast logic in tests
    // This maintains test coverage while avoiding Node.js MessageEvent incompatibility
    const event = new Event('message') as MessageEvent
    Object.assign(event, { data: message })

    // Dispatch to addEventListener handlers
    this.dispatchEvent(event)

    // Also invoke onmessage callback if set
    if (typeof this.onmessage === 'function') {
      this.onmessage(event)
    }
  }

  close(): void {
    // Stub: No-op in test environment (no cleanup needed for in-memory stub)
  }
}

// Replace Node's incompatible BroadcastChannel with test-compatible stub
globalThis.BroadcastChannel = BroadcastChannelStub as typeof BroadcastChannel

// Note: Supabase client mocking removed - each test file handles its own mocks
// This allows for more flexible test-specific mocking strategies
// See AuthContext.test.tsx for example of per-test mocking

// Extend Vitest matchers with Testing Library DOM matchers
expect.extend({})

// Reset factory IDs before each test for deterministic test data
beforeEach(() => {
  resetFactoryIds()
})

// Run cleanup after each test case (e.g. clearing jsdom, React components)
afterEach(() => {
  cleanup()

  // Clear all mocks to prevent test interference
  vi.clearAllMocks()
})

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver (used by TipTap editor and other components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver (used by lazy loading)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn().mockReturnValue([]),
}))

// Mock requestAnimationFrame and cancelAnimationFrame (used by TipTap editor)
// Node.js doesn't have these browser APIs - polyfill with setTimeout/clearTimeout
global.requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
  return setTimeout(() => callback(Date.now()), 0) as unknown as number
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})

// Suppress console errors in tests (unless debugging)
// Comment out to see actual errors during test development
const originalConsoleError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    // Allow specific errors through for debugging
    const message = String(args[0])
    if (
      message.includes('Warning: ReactDOM.render') ||
      message.includes('Not implemented: HTMLFormElement.prototype.submit')
    ) {
      return // Suppress known harmless warnings
    }
    originalConsoleError(...args)
  }
})

afterEach(() => {
  console.error = originalConsoleError
})

/**
 * Global Teardown - Cleanup
 */
afterAll(async () => {
  // Clear any remaining timers
  vi.clearAllTimers()
})
