import React, { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useVideos } from '../hooks/useVideos'
import { useScripts } from '../hooks/useScripts'
import { useScriptComponents } from '../hooks/useScriptComponents'
import type { Project, Video, Script, ScriptComponent } from '../types'
import './Sidebar.css'

interface SidebarProps {
  selectedProject: Project | undefined
  selectedVideo: Video | undefined
  selectedScript: Script | undefined
  selectedComponent: ScriptComponent | undefined
  onSelectProject: (project: Project) => void
  onSelectVideo: (video: Video) => void
  onSelectScript: (script: Script) => void
  onSelectComponent: (component: ScriptComponent) => void
}

/**
 * Navigation Sidebar
 *
 * Hierarchical structure: Projects (with nested Videos) → Scripts → Components
 * Videos collapse/expand under each project
 * Components are read-only (displayed but not editable in this app)
 *
 * North Star I1: Component spine is immutable in scenes-web
 */
export function Sidebar({
  selectedProject,
  selectedVideo,
  selectedScript,
  selectedComponent,
  onSelectProject,
  onSelectVideo,
  onSelectScript,
  onSelectComponent,
}: SidebarProps) {
  const projectsQuery = useProjects()
  const videosQuery = useVideos(selectedProject?.eav_code)
  const scriptsQuery = useScripts(selectedVideo?.id)
  const componentsQuery = useScriptComponents(selectedScript?.id)

  // Debug logging
  React.useEffect(() => {
    console.log('[Sidebar] Projects loaded:', {
      projectsLoading: projectsQuery.isLoading,
      projectsCount: projectsQuery.data?.length ?? 0,
      projectsError: projectsQuery.error?.message,
    })
  }, [projectsQuery.isLoading, projectsQuery.data?.length, projectsQuery.error?.message])

  React.useEffect(() => {
    if (selectedProject?.eav_code) {
      console.log('[Sidebar] Videos query for project:', {
        eav_code: selectedProject.eav_code,
        videosLoading: videosQuery.isLoading,
        videosCount: videosQuery.data?.length ?? 0,
        videosError: videosQuery.error?.message,
      })
    }
  }, [selectedProject?.eav_code, videosQuery.isLoading, videosQuery.data?.length, videosQuery.error?.message])

  React.useEffect(() => {
    console.log('[Sidebar] selectedVideo changed:', selectedVideo ? `${selectedVideo.title} (${selectedVideo.id})` : 'none')
    if (selectedVideo?.id) {
      console.log('[Sidebar] Scripts query for video:', {
        videoId: selectedVideo.id,
        scriptsLoading: scriptsQuery.isLoading,
        scriptsCount: scriptsQuery.data?.length ?? 0,
        scriptsError: scriptsQuery.error?.message,
      })
    }
  }, [selectedVideo, selectedVideo?.id, videosQuery.isLoading, videosQuery.data?.length, videosQuery.error?.message, scriptsQuery.isLoading, scriptsQuery.data?.length, scriptsQuery.error?.message])

  React.useEffect(() => {
    console.log('[Sidebar] selectedScript changed:', selectedScript ? `${selectedScript.plain_text.substring(0, 30)} (${selectedScript.id})` : 'none')
    if (selectedScript?.id) {
      console.log('[Sidebar] Components query for script:', {
        scriptId: selectedScript.id,
        componentsLoading: componentsQuery.isLoading,
        componentsCount: componentsQuery.data?.length ?? 0,
        componentsError: componentsQuery.error?.message,
      })
    }
  }, [selectedScript, selectedScript?.id, componentsQuery.isLoading, componentsQuery.data?.length, componentsQuery.error?.message])

  // Track which projects are expanded
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // Auto-expand selected project, but allow manual toggle to override
  React.useEffect(() => {
    console.log('[Sidebar] selectedProject changed:', selectedProject ? `${selectedProject.title} (${selectedProject.id})` : 'none')
    if (selectedProject) {
      console.log('[Sidebar] Expanding project:', selectedProject.id)
      // Ensure selected project is expanded (but don't collapse others)
      setExpandedProjects(prev => new Set([...prev, selectedProject.id]))
    }
  }, [selectedProject])

  const toggleProjectExpanded = (projectId: string) => {
    console.log('[Sidebar] Toggle expand for project:', projectId)
    setExpandedProjects(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(projectId)) {
        newExpanded.delete(projectId)
      } else {
        newExpanded.add(projectId)
      }
      return newExpanded
    })
  }

  return (
    <div className="sidebar">
      {/* Projects Section (with nested videos) */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Projects</h3>
        {projectsQuery.isLoading && <div className="sidebar-loading">Loading...</div>}
        {projectsQuery.error && (
          <div className="sidebar-error">Error loading projects</div>
        )}
        <div className="sidebar-list">
          {projectsQuery.data?.map((project) => (
            <div key={project.id}>
              {/* Project Header with Expand/Collapse */}
              <div className="project-row">
                <button
                  className="expand-toggle"
                  onClick={() => {
                    console.log('[Sidebar] Clicked expand arrow for project:', project.title)
                    // If expanding, also select the project so videos load
                    if (!expandedProjects.has(project.id)) {
                      console.log('[Sidebar] Auto-selecting project on expand')
                      onSelectProject(project)
                    }
                    toggleProjectExpanded(project.id)
                  }}
                  title={expandedProjects.has(project.id) ? 'Collapse' : 'Expand'}
                >
                  {expandedProjects.has(project.id) ? '▼' : '▶'}
                </button>
                <button
                  className={`sidebar-item project-item ${selectedProject?.id === project.id ? 'active' : ''}`}
                  onClick={() => {
                    console.log('[Sidebar] Clicked project:', project.title)
                    onSelectProject(project)
                    toggleProjectExpanded(project.id)
                  }}
                >
                  <span className="sidebar-item-title">{project.title}</span>
                  <span className="sidebar-item-code">{project.eav_code}</span>
                </button>
              </div>

              {/* Nested Videos (shown when project expanded) */}
              {expandedProjects.has(project.id) && selectedProject?.id === project.id && (
                <div className="videos-container" data-testid={`videos-container-${project.id}`}>
                  {videosQuery.isLoading && (
                    <div className="sidebar-loading" data-testid={`videos-loading-${project.id}`}>
                      Loading videos...
                    </div>
                  )}
                  {videosQuery.error && (
                    <div className="sidebar-error" data-testid={`videos-error-${project.id}`}>
                      Error: {videosQuery.error?.message || 'Unknown error loading videos'}
                    </div>
                  )}
                  {!videosQuery.isLoading && !videosQuery.error && videosQuery.data && videosQuery.data.length === 0 && (
                    <div className="sidebar-loading" data-testid={`videos-empty-${project.id}`}>
                      No videos
                    </div>
                  )}
                  {videosQuery.data && videosQuery.data.length > 0 && videosQuery.data.map((video) => (
                    <button
                      key={video.id}
                      className={`sidebar-item video-item ${selectedVideo?.id === video.id ? 'active' : ''}`}
                      onClick={() => {
                        console.log('[Sidebar] Clicked video:', video.title)
                        onSelectVideo(video)
                      }}
                      data-testid={`video-button-${video.id}`}
                    >
                      <span className="sidebar-item-title">{video.title}</span>
                      <span className="sidebar-item-code">{video.eav_code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scripts Section */}
      {selectedVideo && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">Scripts ({scriptsQuery.data?.length ?? 0})</h3>
          {scriptsQuery.isLoading && <div className="sidebar-loading">Loading scripts...</div>}
          {scriptsQuery.error && (
            <div className="sidebar-error">Error loading scripts: {scriptsQuery.error?.message}</div>
          )}
          {!scriptsQuery.isLoading && !scriptsQuery.error && scriptsQuery.data && scriptsQuery.data.length === 0 && (
            <div className="sidebar-loading">No scripts</div>
          )}
          <div className="sidebar-list">
            {scriptsQuery.data?.map((script) => (
              <button
                key={script.id}
                className={`sidebar-item ${selectedScript?.id === script.id ? 'active' : ''}`}
                onClick={() => {
                  console.log('[Sidebar] Clicked script:', script.plain_text.substring(0, 30))
                  onSelectScript(script)
                }}
              >
                <span className="sidebar-item-title">
                  {script.plain_text.substring(0, 30)}...
                </span>
                <span className="sidebar-item-meta">
                  Status: {script.status} | {script.component_count} components
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Components Section (Read-Only) */}
      {selectedScript && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">Components (Read-Only)</h3>
          {componentsQuery.isLoading && <div className="sidebar-loading">Loading...</div>}
          {componentsQuery.error && (
            <div className="sidebar-error">Error loading components</div>
          )}
          <div className="sidebar-list">
            {componentsQuery.data?.map((component) => (
              <button
                key={component.id}
                className={`sidebar-item read-only ${selectedComponent?.id === component.id ? 'active' : ''}`}
                onClick={() => onSelectComponent(component)}
              >
                <span className="sidebar-item-title">
                  Component {component.component_number}
                </span>
                <span className="sidebar-item-preview">
                  {component.content.substring(0, 40)}...
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
