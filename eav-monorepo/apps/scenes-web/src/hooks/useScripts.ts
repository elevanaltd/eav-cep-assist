import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../lib/supabase'
import type { Script } from '../types'

/**
 * Fetch scripts for a specific video
 * Filters by video_id
 */
export function useScripts(videoId: string | undefined) {
  return useQuery({
    queryKey: ['scripts', videoId],
    queryFn: async () => {
      if (!videoId) return []

      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('scripts')
        .select('id, video_id, status, plain_text, component_count, created_at')
        .eq('video_id', videoId)

      if (error) throw error

      return (data || []) as Script[]
    },
    enabled: !!videoId,
  })
}
