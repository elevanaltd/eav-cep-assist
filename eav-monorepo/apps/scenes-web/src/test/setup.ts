/**
 * Global Test Setup
 *
 * Runs before all tests to configure the test environment.
 * Runs cleanup after each test to prevent state leakage.
 */

import { expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

/**
 * BroadcastChannel Polyfill for Node Test Environment
 *
 * **Issue**: Node.js BroadcastChannel expects `Event` instances, but Supabase Auth
 * (used by @workspace/shared) dispatches browser-standard `MessageEvent` instances
 * for cross-tab session synchronization.
 *
 * **Solution**: Stub BroadcastChannel with minimal test-compatible implementation.
 * In test environment, cross-tab sync isn't needed - we just need to prevent errors.
 *
 * **Impact**: Prevents 1,460+ test errors when Supabase Auth initializes BroadcastChannel
 */
class BroadcastChannelStub extends EventTarget {
  readonly name: string
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    super()
    this.name = name
  }

  postMessage(message: unknown): void {
    const event = new Event('message') as MessageEvent
    Object.assign(event, { data: message })
    this.dispatchEvent(event)
    if (typeof this.onmessage === 'function') {
      this.onmessage(event)
    }
  }

  close(): void {
    // No-op in test environment
  }
}

globalThis.BroadcastChannel = BroadcastChannelStub as typeof BroadcastChannel

// Mock shared library to inject test credentials
vi.mock('@workspace/shared/client', async () => {
  const actual = await vi.importActual('@workspace/shared/client') as Record<string, unknown>
  return {
    ...actual,
    createBrowserClient: (url?: string, key?: string) => {
      return (actual.createBrowserClient as (url?: string, key?: string) => unknown)(
        url ?? 'https://test-project.supabase.co',
        key ?? 'test-anon-key'
      )
    }
  }
})

expect.extend({})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn().mockReturnValue([]),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
  return setTimeout(() => callback(Date.now()), 0) as unknown as number
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})

// Suppress harmless console errors in tests
const originalConsoleError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const message = String(args[0])
    if (
      message.includes('Warning: ReactDOM.render') ||
      message.includes('Not implemented: HTMLFormElement.prototype.submit')
    ) {
      return
    }
    originalConsoleError(...args)
  }
})

afterEach(() => {
  console.error = originalConsoleError
})
