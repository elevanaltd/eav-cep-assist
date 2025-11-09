import { describe, it, expect } from 'vitest'
import { applyFieldDependencies } from './shotFieldDependencies'
import type { Shot } from '../types'

describe('applyFieldDependencies', () => {
  describe('movement_type auto-populates shot_type', () => {
    it('should auto-populate shot_type to TRACK when movement_type is Tracking', () => {
      const updates: Partial<Shot> = {
        movement_type: 'Tracking',
      }

      const result = applyFieldDependencies('movement_type', 'Tracking', updates)

      expect(result.movement_type).toBe('Tracking')
      expect(result.shot_type).toBe('TRACK')
    })

    it('should auto-populate shot_type to ESTAB when movement_type is Establishing', () => {
      const updates: Partial<Shot> = {
        movement_type: 'Establishing',
      }

      const result = applyFieldDependencies('movement_type', 'Establishing', updates)

      expect(result.movement_type).toBe('Establishing')
      expect(result.shot_type).toBe('ESTAB')
    })

    it('should not modify shot_type when movement_type is other values', () => {
      const updates: Partial<Shot> = {
        movement_type: 'Static',
      }

      const result = applyFieldDependencies('movement_type', 'Static', updates)

      expect(result.movement_type).toBe('Static')
      expect(result.shot_type).toBeUndefined()
    })

    it('should not affect shot_type when field is not movement_type', () => {
      const updates: Partial<Shot> = {
        subject: 'Person',
      }

      const result = applyFieldDependencies('subject', 'Person', updates)

      expect(result.subject).toBe('Person')
      expect(result.shot_type).toBeUndefined()
    })
  })

  describe('location_start_point clears location_other', () => {
    it('should clear location_other when switching away from Other', () => {
      const updates: Partial<Shot> = {
        location_start_point: 'Kitchen',
      }

      const result = applyFieldDependencies('location_start_point', 'Kitchen', updates)

      expect(result.location_start_point).toBe('Kitchen')
      expect(result.location_other).toBeNull()
    })

    it('should not clear location_other when value is Other', () => {
      const updates: Partial<Shot> = {
        location_start_point: 'Other',
      }

      const result = applyFieldDependencies('location_start_point', 'Other', updates)

      expect(result.location_start_point).toBe('Other')
      expect(result.location_other).toBeUndefined()
    })
  })

  describe('subject clears subject_other', () => {
    it('should clear subject_other when switching away from Other', () => {
      const updates: Partial<Shot> = {
        subject: 'Worker',
      }

      const result = applyFieldDependencies('subject', 'Worker', updates)

      expect(result.subject).toBe('Worker')
      expect(result.subject_other).toBeNull()
    })

    it('should not clear subject_other when value is Other', () => {
      const updates: Partial<Shot> = {
        subject: 'Other',
      }

      const result = applyFieldDependencies('subject', 'Other', updates)

      expect(result.subject).toBe('Other')
      expect(result.subject_other).toBeUndefined()
    })
  })
})
