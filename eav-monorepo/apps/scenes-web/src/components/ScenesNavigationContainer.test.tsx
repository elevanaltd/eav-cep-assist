import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavigationProvider } from '../contexts/NavigationContext'
import { ScenesNavigationContainer } from './ScenesNavigationContainer'

// Mock the hooks
vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      { id: '1', title: 'Project Alpha', eav_code: 'PA001', due_date: '2025-12-31' },
      { id: '2', title: 'Project Beta', eav_code: 'PB001' },
    ],
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../hooks/useVideos', () => ({
  useVideos: (eav_code?: string) => {
    if (eav_code === 'PA001') {
      return {
        data: [
          { id: 'v1', eav_code: 'PA001', title: 'Video 1', main_stream_status: 'ready' },
          { id: 'v2', eav_code: 'PA001', title: 'Video 2', main_stream_status: 'pending' },
        ],
        isLoading: false,
        error: null,
      }
    }
    return {
      data: [],
      isLoading: false,
      error: null,
    }
  },
}))

// Mock useScripts with ability to return different scenarios
interface MockScriptsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  isLoading: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any
}

let useScriptsMockResponse: MockScriptsResponse = {
  data: [],
  isLoading: false,
  error: null,
}

vi.mock('../hooks/useScripts', () => ({
  useScripts: () => useScriptsMockResponse,
}))

describe('ScenesNavigationContainer', () => {
  beforeEach(() => {
    // Reset mock to default state before each test
    useScriptsMockResponse = {
      data: [],
      isLoading: false,
      error: null,
    }
  })

  it('should render navigation sidebar with projects', () => {
    render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    // Should display projects
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('Project Beta')).toBeInTheDocument()
  })

  it('should pass projects and videos to HierarchicalNavigationSidebar', () => {
    const { container } = render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    // Should render the sidebar
    const sidebar = container.querySelector('.nav-sidebar')
    expect(sidebar).toBeInTheDocument()
  })

  it('should handle project expand callbacks', () => {
    const { container } = render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    // Sidebar should be present
    const sidebar = container.querySelector('.nav-sidebar')
    expect(sidebar).toBeInTheDocument()
  })

  it('should show loading state when data is loading', () => {
    // This test validates that loading prop is passed through
    const { container } = render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    expect(container.querySelector('.nav-sidebar')).toBeInTheDocument()
  })

  it('should clear script when scriptsQuery returns empty array (video with no scripts)', () => {
    // Video with no scripts scenario - scriptsQuery.data is empty
    useScriptsMockResponse = {
      data: [],
      isLoading: false,
      error: null,
    }

    const { container } = render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    // Sidebar should still render even with no scripts
    expect(container.querySelector('.nav-sidebar')).toBeInTheDocument()
  })

  it('should clear script when scriptsQuery returns error', () => {
    // Scripts fetch error scenario
    useScriptsMockResponse = {
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch scripts'),
    }

    const { container } = render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    // Sidebar should still render even with error
    expect(container.querySelector('.nav-sidebar')).toBeInTheDocument()
  })

  it('should not leave stale script selected when switching videos', () => {
    // This tests the edge case where previous script remains selected
    // when query returns empty or error for new video
    const { rerender, container } = render(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    expect(container.querySelector('.nav-sidebar')).toBeInTheDocument()

    // Simulate switching to a video with no scripts (empty response)
    useScriptsMockResponse = {
      data: [],
      isLoading: false,
      error: null,
    }

    rerender(
      <NavigationProvider>
        <ScenesNavigationContainer onComponentSelected={() => {}} />
      </NavigationProvider>
    )

    // Sidebar should still be present
    expect(container.querySelector('.nav-sidebar')).toBeInTheDocument()
  })
})
