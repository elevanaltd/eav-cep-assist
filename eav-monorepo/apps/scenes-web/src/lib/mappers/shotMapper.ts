/**
 * Shot Mapper
 *
 * Converts database rows to domain types.
 * Ensures type safety and null→undefined conversion for UI compatibility.
 *
 * NOTE: Post-migration from scene_planning_state - now uses script_component_id
 */

import { Shot } from '../../types'

interface ShotRow {
  id: string
  script_component_id: string
  shot_number: number
  shot_type?: string | null
  location_start_point?: string | null
  location_other?: string | null
  movement_type?: string | null
  subject?: string | null
  subject_other?: string | null
  variant?: string | null
  action?: string | null
  completed?: boolean | null
  owner_user_id?: string | null
  created_at: string
  updated_at: string
}

export function mapShotRowToShot(row: ShotRow): Shot {
  return {
    id: row.id,
    script_component_id: row.script_component_id,
    shot_number: row.shot_number,
    shot_type: row.shot_type ?? null,
    location_start_point: row.location_start_point ?? null,
    location_other: row.location_other ?? null,
    movement_type: row.movement_type ?? null,
    subject: row.subject ?? null,
    subject_other: row.subject_other ?? null,
    variant: row.variant ?? null,
    action: row.action ?? null,
    completed: row.completed ?? null,
    owner_user_id: row.owner_user_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export function mapShotRowsToShots(rows: ShotRow[]): Shot[] {
  return rows.map(mapShotRowToShot)
}
