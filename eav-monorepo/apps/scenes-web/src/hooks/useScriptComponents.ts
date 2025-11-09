import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../lib/supabase'
import type { ScriptComponent } from '../types'

/**
 * Fetch script components (scene breakdowns) for a specific script
 *
 * North Star I1: Component-based spine
 * Components are READ-ONLY in scenes-web (edited in scripts-web)
 * Ordered by component_number for natural reading order
 */
export function useScriptComponents(scriptId: string | undefined) {
  return useQuery({
    queryKey: ['scriptComponents', scriptId],
    queryFn: async () => {
      if (!scriptId) return []

      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('script_components')
        .select('id, script_id, component_number, content, word_count, created_at')
        .eq('script_id', scriptId)
        .order('component_number', { ascending: true })

      if (error) throw error

      return (data || []) as ScriptComponent[]
    },
    enabled: !!scriptId,
  })
}
