import type { Shot } from '../types'

/**
 * Applies field dependency rules for shot updates
 *
 * Rules:
 * 1. movement_type = "Tracking" → auto-populate shot_type = "TRACK"
 * 2. movement_type = "Establishing" → auto-populate shot_type = "ESTAB"
 * 3. location_start_point ≠ "Other" → clear location_other
 * 4. subject ≠ "Other" → clear subject_other
 *
 * @param field - The field being updated
 * @param value - The new value for the field
 * @param updates - The existing updates object
 * @returns Modified updates object with dependency rules applied
 */
export function applyFieldDependencies(
  field: keyof Shot,
  value: string | null,
  updates: Partial<Shot>
): Partial<Shot> {
  const result = { ...updates }

  // Rule 1 & 2: Auto-populate shot_type based on movement_type
  if (field === 'movement_type') {
    if (value === 'Tracking') {
      result.shot_type = 'TRACK'
    } else if (value === 'Establishing') {
      result.shot_type = 'ESTAB'
    }
  }

  // Rule 3: Clear location_other when switching away from "Other"
  if (field === 'location_start_point' && value !== 'Other') {
    result.location_other = null
  }

  // Rule 4: Clear subject_other when switching away from "Other"
  if (field === 'subject' && value !== 'Other') {
    result.subject_other = null
  }

  return result
}
