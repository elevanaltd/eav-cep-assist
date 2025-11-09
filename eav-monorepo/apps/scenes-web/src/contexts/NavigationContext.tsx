import React, { createContext, useContext, useState } from 'react'
import { NavigationProvider as SharedNavigationProvider, useNavigation as useSharedNavigation } from '@workspace/shared'
import type { Project, Video, Script, ScriptComponent } from '../types'

interface NavigationState {
  selectedProject: Project | undefined
  selectedVideo: Video | undefined
  selectedScript: Script | undefined
  selectedComponent: ScriptComponent | undefined
}

interface NavigationContextValue extends NavigationState {
  setSelectedProject: (project: Project | undefined | null) => void
  setSelectedVideo: (video: Video | undefined | null, project?: Project | undefined | null) => void
  setSelectedScript: (script: Script | undefined) => void
  setSelectedComponent: (component: ScriptComponent | undefined) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

/**
 * Navigation Context Provider
 *
 * Wraps @workspace/shared NavigationProvider and extends it with app-specific state
 * Manages hierarchical navigation: Project → Video → Script → Component
 * Projects/Videos managed by shared-lib; Scripts/Components managed locally
 */
function NavigationProviderContent({ children }: { children: React.ReactNode }) {
  const sharedNav = useSharedNavigation()
  const [selectedScript, setSelectedScriptState] = useState<Script | undefined>()
  const [selectedComponent, setSelectedComponentState] = useState<ScriptComponent | undefined>()

  const setSelectedScript = (script: Script | undefined) => {
    setSelectedScriptState(script)
    // Clear children when parent changes
    setSelectedComponentState(undefined)
  }

  const setSelectedComponent = (component: ScriptComponent | undefined) => {
    setSelectedComponentState(component)
  }

  const value: NavigationContextValue = {
    // @workspace/shared types are compatible - casting local types which are supersets
    selectedProject: (sharedNav.selectedProject as unknown as Project) || undefined,
    selectedVideo: (sharedNav.selectedVideo as unknown as Video) || undefined,
    selectedScript,
    selectedComponent,
    setSelectedProject: (project) => sharedNav.setSelectedProject(project as unknown as Parameters<typeof sharedNav.setSelectedProject>[0]),
    setSelectedVideo: (video, project) => sharedNav.setSelectedVideo(video as unknown as Parameters<typeof sharedNav.setSelectedVideo>[0], project as unknown as Parameters<typeof sharedNav.setSelectedVideo>[1]),
    setSelectedScript,
    setSelectedComponent,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  return (
    <SharedNavigationProvider>
      <NavigationProviderContent>{children}</NavigationProviderContent>
    </SharedNavigationProvider>
  )
}

// Hook must be in separate to avoid React refresh warning
// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
