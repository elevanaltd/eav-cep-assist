import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'

const mockUseProjects = vi.fn()
const mockUseVideos = vi.fn()
const mockUseScripts = vi.fn()
const mockUseScriptComponents = vi.fn()

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => mockUseProjects(),
}))

vi.mock('../hooks/useVideos', () => ({
  useVideos: (id: string | undefined) => mockUseVideos(id),
}))

vi.mock('../hooks/useScripts', () => ({
  useScripts: (id: string | undefined) => mockUseScripts(id),
}))

vi.mock('../hooks/useScriptComponents', () => ({
  useScriptComponents: (id: string | undefined) => mockUseScriptComponents(id),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mocks for all hooks
    mockUseVideos.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    mockUseScripts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    mockUseScriptComponents.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('should render projects section with loading state', () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(
      <Sidebar
        selectedProject={undefined}
        selectedVideo={undefined}
        selectedScript={undefined}
        selectedComponent={undefined}
        onSelectProject={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectScript={vi.fn()}
        onSelectComponent={vi.fn()}
      />,
      { wrapper }
    )

    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('should display projects when loaded', async () => {
    mockUseProjects.mockReturnValue({
      data: [
        { id: '1', title: 'Project A', eav_code: 'P001', created_at: '2025-01-01' },
        { id: '2', title: 'Project B', eav_code: 'P002', created_at: '2025-01-02' },
      ],
      isLoading: false,
      error: null,
    })

    mockUseVideos.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    mockUseScripts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    mockUseScriptComponents.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    const onSelectProject = vi.fn()

    render(
      <Sidebar
        selectedProject={undefined}
        selectedVideo={undefined}
        selectedScript={undefined}
        selectedComponent={undefined}
        onSelectProject={onSelectProject}
        onSelectVideo={vi.fn()}
        onSelectScript={vi.fn()}
        onSelectComponent={vi.fn()}
      />,
      { wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })
  })

  it('should call onSelectProject when project is clicked', async () => {
    const mockProject = {
      id: '1',
      title: 'Project A',
      eav_code: 'P001',
      created_at: '2025-01-01',
    }

    mockUseProjects.mockReturnValue({
      data: [mockProject],
      isLoading: false,
      error: null,
    })

    mockUseVideos.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    mockUseScripts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    mockUseScriptComponents.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    const onSelectProject = vi.fn()
    const user = userEvent.setup()

    render(
      <Sidebar
        selectedProject={undefined}
        selectedVideo={undefined}
        selectedScript={undefined}
        selectedComponent={undefined}
        onSelectProject={onSelectProject}
        onSelectVideo={vi.fn()}
        onSelectScript={vi.fn()}
        onSelectComponent={vi.fn()}
      />,
      { wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Project A'))

    expect(onSelectProject).toHaveBeenCalledWith(mockProject)
  })

  it('should display videos when project is selected and expanded', async () => {
    const mockProject = {
      id: '1',
      title: 'Project A',
      eav_code: 'P001',
      project_phase: 'In Production',
      created_at: '2025-01-01',
    }

    const mockVideos = [
      { id: 'v1', title: 'Video A', eav_code: 'V001', created_at: '2025-01-01' },
    ]

    mockUseProjects.mockReturnValue({
      data: [mockProject],
      isLoading: false,
      error: null,
    })

    mockUseVideos.mockReturnValue({
      data: mockVideos,
      isLoading: false,
      error: null,
    })

    mockUseScripts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    mockUseScriptComponents.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    render(
      <Sidebar
        selectedProject={mockProject}
        selectedVideo={undefined}
        selectedScript={undefined}
        selectedComponent={undefined}
        onSelectProject={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectScript={vi.fn()}
        onSelectComponent={vi.fn()}
      />,
      { wrapper }
    )

    // With selectedProject set, the component should automatically expand and show videos
    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.getByText('Video A')).toBeInTheDocument()
    })
  })
})
