import { describe, it, expect } from 'vitest'
import { mapShotRowToShot } from './shotMapper'

describe('shotMapper', () => {
  it('should convert database row to Shot domain type', () => {
    const row = {
      id: 'shot-1',
      script_component_id: 'component-1',
      shot_number: 1,
      shot_type: 'WS',
      location_start_point: 'Standard',
      location_other: null,
      movement_type: 'Establishing',
      subject: 'Standard',
      subject_other: null,
      variant: 'front door',
      action: 'demo',
      completed: false,
      owner_user_id: 'user-123',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }

    const shot = mapShotRowToShot(row)

    expect(shot.id).toBe('shot-1')
    expect(shot.script_component_id).toBe('component-1')
    expect(shot.shot_number).toBe(1)
    expect(shot.shot_type).toBe('WS')
    expect(shot.location_start_point).toBe('Standard')
  })

  it('should convert null fields to null', () => {
    const row = {
      id: 'shot-1',
      script_component_id: 'component-1',
      shot_number: 1,
      shot_type: undefined,
      location_start_point: undefined,
      location_other: undefined,
      movement_type: undefined,
      subject: undefined,
      subject_other: undefined,
      variant: undefined,
      action: undefined,
      completed: undefined,
      owner_user_id: undefined,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }

    const shot = mapShotRowToShot(row)

    expect(shot.shot_type).toBeNull()
    expect(shot.location_start_point).toBeNull()
    expect(shot.subject_other).toBeNull()
  })
})
