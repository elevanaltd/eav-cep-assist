import { useState, useEffect } from 'react'
import { HierarchicalNavigationSidebar, type Video } from '@workspace/shared'
import { useProjects } from '../hooks/useProjects'
import { useVideos } from '../hooks/useVideos'
import { useScripts } from '../hooks/useScripts'
import { useNavigation } from '../contexts/NavigationContext'

interface ScenesNavigationContainerProps {
  onComponentSelected?: (componentId: string) => void
}

/**
 * Scenes Navigation Container
 *
 * Wrapper around HierarchicalNavigationSidebar with scenes-web specific logic
 * - Fetches projects, videos, scripts, components
 * - Handles navigation state through NavigationContext
 * - Passes data to shared UI component
 *
 * North Star I1: Component spine is immutable in scenes-web
 */
export function ScenesNavigationContainer({ onComponentSelected: _onComponentSelected }: ScenesNavigationContainerProps) {
  const projectsQuery = useProjects()
  const { selectedProject, selectedVideo, setSelectedScript } = useNavigation()
  const videosQuery = useVideos(selectedProject?.eav_code)
  const scriptsQuery = useScripts(selectedVideo?.id)

  // Track expanded projects locally
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // When video is selected, automatically load and set its script
  // This enables useScriptComponents(selectedScript.id) to fetch components
  useEffect(() => {
    // If no video selected, clear script
    if (!selectedVideo?.id) {
      setSelectedScript(undefined)
      return
    }

    // If video is selected but script query has error or no data, clear script
    if (scriptsQuery.error || !scriptsQuery.data || scriptsQuery.data.length === 0) {
      setSelectedScript(undefined)
      return
    }

    // North Star I6: One script per video (unique constraint)
    // Set the script only if we have valid data
    const script = scriptsQuery.data[0]
    setSelectedScript(script)
  }, [selectedVideo?.id, scriptsQuery.data, scriptsQuery.error, setSelectedScript])

  const handleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  // Transform videos data into the format HierarchicalNavigationSidebar expects
  const videosMap: Record<string, Video[]> = {}
  if (videosQuery.data) {
    const selectedEavCode = selectedProject?.eav_code
    if (selectedEavCode) {
      videosMap[selectedEavCode] = videosQuery.data as Video[]
    }
  }

  return (
    <HierarchicalNavigationSidebar
      projects={projectsQuery.data || []}
      videos={videosMap}
      loading={projectsQuery.isLoading || videosQuery.isLoading}
      error={projectsQuery.error?.message || videosQuery.error?.message}
      expandedProjects={expandedProjects}
      onProjectExpand={handleProjectExpand}
    />
  )
}
