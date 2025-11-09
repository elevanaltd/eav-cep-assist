import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '../lib/supabase'
import type { Shot } from '../types'

interface InsertShotInput {
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
}

interface UpdateShotInput extends Partial<InsertShotInput> {
  id: string
}

/**
 * Mutations for shot table operations
 * Invalidates shots query after mutations to trigger refetch
 *
 * NOTE: Post-migration from scene_planning_state - now uses direct FK
 * shots.script_component_id → script_components.id
 */
export function useShotMutations() {
  const queryClient = useQueryClient()

  const insertShot = useMutation({
    mutationFn: async (input: InsertShotInput) => {
      const supabase = getSupabaseClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('shots')
        .insert([input])
        .select()

      if (error) throw error

      return data?.[0] as Shot
    },
    onSuccess: (newShot) => {
      // Invalidate shots query for the script component to refetch
      queryClient.invalidateQueries({
        queryKey: ['shots', newShot.script_component_id],
      })
    },
  })

  const updateShot = useMutation({
    mutationFn: async (input: UpdateShotInput) => {
      const supabase = getSupabaseClient()
      const { id, ...updates } = input

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('shots')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error

      return data?.[0] as Shot
    },
    onSuccess: (updatedShot) => {
      // Invalidate shots query for the script component
      queryClient.invalidateQueries({
        queryKey: ['shots', updatedShot.script_component_id],
      })
    },
  })

  const deleteShot = useMutation({
    mutationFn: async ({ id, scriptComponentId }: { id: string; scriptComponentId: string }) => {
      const supabase = getSupabaseClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('shots').delete().eq('id', id)

      if (error) throw error

      return { id, scriptComponentId }
    },
    onSuccess: (result) => {
      // Invalidate shots query for the script component
      queryClient.invalidateQueries({
        queryKey: ['shots', result.scriptComponentId],
      })
    },
  })

  return {
    insertShot,
    updateShot,
    deleteShot,
  }
}
