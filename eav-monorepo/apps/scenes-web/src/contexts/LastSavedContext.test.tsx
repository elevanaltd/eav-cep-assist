import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { LastSavedProvider, useLastSaved } from './LastSavedContext'
import React from 'react'

describe('LastSavedContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should provide recordSave and lastSaved', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(LastSavedProvider, { children })

    const { result } = renderHook(() => useLastSaved(), { wrapper })

    expect(result.current.recordSave).toBeDefined()
    expect(result.current.lastSaved).toBe(null)
  })

  it('should update lastSaved when recordSave is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(LastSavedProvider, { children })

    const { result } = renderHook(() => useLastSaved(), { wrapper })

    const beforeTime = new Date()

    act(() => {
      result.current.recordSave()
    })

    expect(result.current.lastSaved).not.toBe(null)
    expect(result.current.lastSaved!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
  })

  it('should format seconds ago correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(LastSavedProvider, { children })

    const { result } = renderHook(() => useLastSaved(), { wrapper })

    act(() => {
      result.current.recordSave()
    })

    expect(result.current.formattedLastSaved).toBe('0s ago')

    act(() => {
      vi.advanceTimersByTime(5000) // 5 seconds
    })

    expect(result.current.formattedLastSaved).toBe('5s ago')
  })

  it('should format minutes ago correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(LastSavedProvider, { children })

    const { result } = renderHook(() => useLastSaved(), { wrapper })

    act(() => {
      result.current.recordSave()
    })

    act(() => {
      vi.advanceTimersByTime(65000) // 1 minute 5 seconds
    })

    expect(result.current.formattedLastSaved).toBe('1m ago')
  })

  it('should format hours ago correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(LastSavedProvider, { children })

    const { result } = renderHook(() => useLastSaved(), { wrapper })

    act(() => {
      result.current.recordSave()
    })

    act(() => {
      vi.advanceTimersByTime(3600000) // 1 hour
    })

    expect(result.current.formattedLastSaved).toBe('1h ago')
  })

  it('should throw error when useLastSaved is called outside provider', () => {
    expect(() => {
      renderHook(() => useLastSaved())
    }).toThrow('useLastSaved must be used within LastSavedProvider')
  })
})
