import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../lib/supabase'
import type { Shot } from '../types'

/**
 * Fetch shots for a specific script component
 * Ordered by shot_number for sequential display
 *
 * NOTE: Post-migration from scene_planning_state - now uses direct FK
 * shots.script_component_id → script_components.id
 */
export function useShots(scriptComponentId: string | undefined) {
  return useQuery({
    queryKey: ['shots', scriptComponentId],
    queryFn: async () => {
      if (!scriptComponentId) return []

      const supabase = getSupabaseClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error} = await (supabase as any)
        .from('shots')
        .select(
          'id, script_component_id, shot_number, shot_type, location_start_point, location_other, movement_type, subject, subject_other, variant, action, owner_user_id, created_at, updated_at'
        )
        .eq('script_component_id', scriptComponentId)
        .order('shot_number', { ascending: true })

      if (error) {
        console.error('[useShots] Query error:', error.message, error.details, error.hint)
        throw error
      }

      return (data || []) as Shot[]
    },
    enabled: !!scriptComponentId,
  })
}
