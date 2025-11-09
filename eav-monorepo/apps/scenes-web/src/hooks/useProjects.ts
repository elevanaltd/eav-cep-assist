import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../lib/supabase'
import type { Project } from '../types'

/**
 * Fetch projects accessible to current user via user_clients RLS
 * Filters to only active production phases with at least one video
 *
 * North Star I2: Multi-client data isolation
 * RLS ensures users see only their authorized projects
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const supabase = getSupabaseClient()

      // Use !inner join to filter projects that have at least one video
      // The join links projects.eav_code = videos.eav_code
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, eav_code, project_phase, created_at, videos!inner(id)')
        .in('project_phase', ['Pre-Production', 'In Production', 'Post-Production'])
        .order('title', { ascending: true })

      if (error) throw error

      // Remove videos property from result (we only needed it for filtering)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (data || []).map(({ videos, ...project }) => project) as Project[]
    },
  })
}
