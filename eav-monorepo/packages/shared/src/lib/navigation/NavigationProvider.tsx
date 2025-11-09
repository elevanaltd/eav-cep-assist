/**
 * Navigation Provider
 *
 * React context provider for hierarchical navigation state management.
 * Handles project/video selection with automatic state synchronization.
 *
 * Extracted from scripts-web to enable reuse across EAV apps.
 */

import { createContext, useContext, useState, ReactNode, ReactElement } from 'react'
import type { Project, Video, NavigationContextType } from './NavigationContext'

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

interface NavigationProviderProps {
  children: ReactNode
}

export function NavigationProvider({ children }: NavigationProviderProps): ReactElement {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  const handleSetSelectedProject = (project: Project | null): void => {
    setSelectedProject(project)
    // Clear video selection when switching projects (unless same eav_code)
    if (selectedVideo && project?.eav_code !== selectedVideo.eav_code) {
      setSelectedVideo(null)
    }
  }

  const handleSetSelectedVideo = (video: Video | null, project?: Project | null): void => {
    setSelectedVideo(video)
    // Automatically set project if video provided and project not set
    if (video && project && selectedProject?.id !== project.id) {
      setSelectedProject(project)
    }
  }

  const clearSelection = (): void => {
    setSelectedProject(null)
    setSelectedVideo(null)
  }

  const isProjectSelected = (projectId: string): boolean => {
    return selectedProject?.id === projectId
  }

  const isVideoSelected = (videoId: string): boolean => {
    return selectedVideo?.id === videoId
  }

  const value: NavigationContextType = {
    selectedProject,
    selectedVideo,
    setSelectedProject: handleSetSelectedProject,
    setSelectedVideo: handleSetSelectedVideo,
    clearSelection,
    isProjectSelected,
    isVideoSelected,
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

/**
 * Hook to access navigation context
 *
 * @throws Error if used outside NavigationProvider
 */
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
