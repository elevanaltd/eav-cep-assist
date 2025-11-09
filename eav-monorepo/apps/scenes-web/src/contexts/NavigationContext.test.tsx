import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigation, NavigationProvider } from './NavigationContext'
import type { Project } from '../types'

function TestComponent() {
  const { selectedProject, setSelectedProject } = useNavigation()

  return (
    <div>
      <div>{selectedProject ? `Selected: ${selectedProject.title}` : 'No selection'}</div>
      <button
        onClick={() =>
          setSelectedProject({
            id: '1',
            title: 'Test Project',
            eav_code: 'TP001',
            created_at: '2025-01-01',
          } as Project)
        }
      >
        Select Project
      </button>
    </div>
  )
}

describe('NavigationContext', () => {
  it('should provide navigation state', async () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByText('No selection')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByText('Select Project'))

    expect(screen.getByText('Selected: Test Project')).toBeInTheDocument()
  })

  it('should clear selections when parent changes', async () => {
    const TestComponentWithReset = () => {
      const { selectedProject, selectedVideo, setSelectedProject, setSelectedVideo } =
        useNavigation()

      return (
        <div>
          <div>
            {selectedProject?.title || 'No project'} | {selectedVideo?.title || 'No video'}
          </div>
          <button
            onClick={() =>
              setSelectedProject({
                id: '1',
                title: 'Project 1',
                eav_code: 'P001',
                created_at: '2025-01-01',
              })
            }
          >
            Set Project
          </button>
          <button
            onClick={() =>
              setSelectedVideo({
                id: 'v1',
                title: 'Video 1',
                eav_code: 'V001',
                created_at: '2025-01-01',
              })
            }
          >
            Set Video
          </button>
          <button
            onClick={() =>
              setSelectedProject({
                id: '2',
                title: 'Project 2',
                eav_code: 'P002',
                created_at: '2025-01-01',
              })
            }
          >
            Change Project
          </button>
        </div>
      )
    }

    const user = userEvent.setup()

    render(
      <NavigationProvider>
        <TestComponentWithReset />
      </NavigationProvider>
    )

    // Set project and video
    await user.click(screen.getByText('Set Project'))
    await user.click(screen.getByText('Set Video'))
    expect(screen.getByText('Project 1 | Video 1')).toBeInTheDocument()

    // Change project should clear video
    await user.click(screen.getByText('Change Project'))
    expect(screen.getByText('Project 2 | No video')).toBeInTheDocument()
  })
})
