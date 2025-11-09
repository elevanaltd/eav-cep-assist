import React, { useState, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@workspace/shared/dist/index.css'
import { AuthProvider } from './contexts/AuthContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { LastSavedProvider } from './contexts/LastSavedContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PrivateRoute } from './components/auth/PrivateRoute'
import { Login } from './components/auth/Login'
import { ScenesNavigationContainer } from './components/ScenesNavigationContainer'
import { ShotTable } from './components/ShotTable'
import { Header } from '@workspace/shared'
import { useNavigation } from './contexts/NavigationContext'
import { useAuth } from './hooks/useAuth'
import { useLastSaved } from './contexts/LastSavedContext'
import { useScriptComponents } from './hooks/useScriptComponents'
import type { ScriptComponent } from './types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

// Workspace with navigation
export function ScenesWorkspace() {
  const nav = useNavigation()
  const { logout, user } = useAuth()
  const { lastSaved } = useLastSaved()
  const componentsQuery = useScriptComponents(nav.selectedScript?.id)
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const componentRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const toggleComponent = useCallback((componentId: string) => {
    const scrollContainer = scrollContainerRef.current
    const componentElement = componentRefs.current.get(componentId)

    if (!scrollContainer || !componentElement) {
      setExpandedComponents(prev => {
        const newSet = new Set(prev)
        if (newSet.has(componentId)) {
          newSet.delete(componentId)
        } else {
          newSet.add(componentId)
        }
        return newSet
      })
      return
    }

    const isExpanded = expandedComponents.has(componentId)
    const isCollapsing = isExpanded

    if (isCollapsing) {
      // Preserve visual position of header when collapsing
      const rectBefore = componentElement.getBoundingClientRect()

      setExpandedComponents(prev => {
        const newSet = new Set(prev)
        newSet.delete(componentId)
        return newSet
      })

      // Wait for layout to settle, then adjust scroll to keep header stationary
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rectAfter = componentElement.getBoundingClientRect()
          const delta = rectAfter.top - rectBefore.top
          scrollContainer.scrollTop += delta
        })
      })
    } else {
      // Expanding - no scroll adjustment needed
      setExpandedComponents(prev => {
        const newSet = new Set(prev)
        newSet.add(componentId)
        return newSet
      })
    }
  }, [expandedComponents])

  const [showSettingsDemo, setShowSettingsDemo] = useState(false)

  return (
    <div className="scenes-workspace">
      <Header
        title="Scene Planning"
        userEmail={user?.email}
        lastSaved={lastSaved || new Date()}
        onSettings={() => setShowSettingsDemo(!showSettingsDemo)}
      />
      {/* Demo: Settings panel (app-specific content) */}
      {showSettingsDemo && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: '16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '200px',
          zIndex: 999,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Settings</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>App-specific content</p>
          </div>
          <button onClick={logout} style={{
            width: '100%',
            padding: '8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Logout
          </button>
        </div>
      )}
      <div className="app-layout">
        <ScenesNavigationContainer
          onComponentSelected={(componentId) => {
            const component = componentsQuery.data?.find(c => c.id === componentId)
            if (component) {
              nav.setSelectedComponent(component)
            }
          }}
        />
        <div className="main-content">
          <div className="content-header">
            <h2>Scene Planning & Shot Lists</h2>
            <p>Select a video from the navigation to start planning its scenes and shots</p>
          </div>
          <div className="content-container">
            <div className="content-scroll" ref={scrollContainerRef}>
              {!nav.selectedScript ? (
                <div className="empty-state">
                  <h3>Select a Script</h3>
                  <p>Choose a project, video, and script to view all components and shots</p>
                </div>
              ) : (
                <>
                  {componentsQuery.isLoading && (
                    <div className="empty-state">
                      <p>Loading components...</p>
                    </div>
                  )}
                  {componentsQuery.error && (
                    <div className="error-state">
                      <p>Error loading components: {componentsQuery.error?.message}</p>
                    </div>
                  )}
                  {componentsQuery.data && componentsQuery.data.length === 0 && (
                    <div className="empty-state">
                      <p>No components found for this script</p>
                    </div>
                  )}
                  {componentsQuery.data && componentsQuery.data.map((component: ScriptComponent) => (
                    <div
                      key={component.id}
                      className="component-card"
                      ref={(el) => {
                        if (el) {
                          componentRefs.current.set(component.id, el)
                        } else {
                          componentRefs.current.delete(component.id)
                        }
                      }}
                    >
                      <button
                        className="component-header"
                        onClick={() => toggleComponent(component.id)}
                      >
                        <span>Scene {component.component_number}: {component.content.substring(0, 50)}...</span>
                        <span className="toggle-icon">{expandedComponents.has(component.id) ? '▼' : '▶'}</span>
                      </button>
                      {expandedComponents.has(component.id) && (
                        <div className="component-body">
                          <div className="component-text">
                            <h3>{`Scene ${component.component_number}`}</h3>
                            <p>{component.content}</p>
                          </div>
                          <ShotTable component={component} />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Embedded component for use in multi-app shells (no BrowserRouter)
// Separates routing concerns for potential future composition patterns
export function EmbeddedScenes() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider>
          <LastSavedProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <ScenesWorkspace />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </LastSavedProvider>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Standalone app with router (for independent deployment)
function App() {
  return (
    <BrowserRouter>
      <EmbeddedScenes />
    </BrowserRouter>
  )
}

export default App
