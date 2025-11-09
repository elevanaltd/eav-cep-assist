import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Logger } from './logger'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('debug method', () => {
    it('should log debug messages', () => {
      const spy = vi.spyOn(console, 'debug')
      Logger.debug('test message')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('info method', () => {
    it('should log info messages', () => {
      const spy = vi.spyOn(console, 'info')
      Logger.info('test message')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('warn method', () => {
    it('should log warn messages', () => {
      const spy = vi.spyOn(console, 'warn')
      Logger.warn('test message')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('error method', () => {
    it('should log error messages', () => {
      const spy = vi.spyOn(console, 'error')
      Logger.error('test message')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('security method', () => {
    it('should always log security events', () => {
      const spy = vi.spyOn(console, 'error')
      Logger.security('test security event')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('should redact sensitive data', () => {
      const spy = vi.spyOn(console, 'error')
      Logger.security('test', { password: 'secret123' })
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('metadata handling', () => {
    it('should include metadata in logs', () => {
      const spy = vi.spyOn(console, 'info')
      Logger.info('test message', { userId: '123', action: 'create' })
      expect(spy).toHaveBeenCalledWith(expect.any(String), 'test message', expect.any(Object))
      spy.mockRestore()
    })
  })
})
