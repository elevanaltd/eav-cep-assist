/**
 * Navigation Context Types
 *
 * Extracted from scripts-web production implementation for shared use across all EAV apps.
 *
 * @see /Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/contexts/NavigationContext.tsx
 */

// Critical-Engineer: consulted for Architecture pattern selection
// Decision: Extract FULL production contract (not minimal handoff spec) for seamless migration

export interface Project {
  id: string
  title: string
  eav_code: string
  due_date?: string
  project_phase?: string | null
}

export interface Video {
  id: string
  eav_code: string
  title: string
  main_stream_status?: string
  vo_stream_status?: string
}

export interface NavigationContextType {
  // Selection state
  selectedProject: Project | null
  selectedVideo: Video | null

  // Selection actions
  setSelectedProject: (project: Project | null) => void
  setSelectedVideo: (video: Video | null, project?: Project | null) => void

  // Helpers
  clearSelection: () => void
  isProjectSelected: (projectId: string) => boolean
  isVideoSelected: (videoId: string) => boolean
}
