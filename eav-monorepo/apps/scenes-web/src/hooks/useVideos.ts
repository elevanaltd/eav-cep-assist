import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Video } from '../types'

/**
 * Fetch videos for a specific project (via eav_code)
 * Videos link to projects through eav_code, not direct foreign key
 *
 * Only runs when:
 * - User is authenticated (prevents unauthorized queries)
 * - Project eav_code is provided (prevents invalid queries)
 */
export function useVideos(projectEavCode: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['videos', projectEavCode],
    queryFn: async () => {
      if (!projectEavCode) return []

      const supabase = getSupabaseClient()

      console.log('[useVideos] Fetching videos for eav_code:', projectEavCode)

      const { data, error } = await supabase
        .from('videos')
        .select('id, title, eav_code, created_at')
        .eq('eav_code', projectEavCode)
        .order('title', { ascending: true })

      console.log('[useVideos] Response:', { dataCount: data?.length ?? 0, error: error?.message })

      if (error) {
        console.error('[useVideos] Query error:', error)
        throw error
      }

      console.log('[useVideos] Returning', (data || []).length, 'videos')
      return (data || []) as Video[]
    },
    enabled: !!projectEavCode && !!user,
  })
}
