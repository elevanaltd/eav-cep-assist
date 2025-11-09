import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationProvider } from '../lib/navigation';
import { HierarchicalNavigationSidebar } from './HierarchicalNavigationSidebar';

describe('HierarchicalNavigationSidebar', () => {
  const mockProjects = [
    { id: '1', title: 'Project Alpha', eav_code: 'PA001' },
    { id: '2', title: 'Project Beta', eav_code: 'PB001' },
  ];

  const mockVideos = {
    PA001: [
      { id: 'v1', eav_code: 'PA001', title: 'Video 1', main_stream_status: 'ready' },
      { id: 'v2', eav_code: 'PA001', title: 'Video 2', main_stream_status: 'processing' },
    ],
  };

  it('should render project list', () => {
    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={mockProjects}
          videos={mockVideos}
          loading={false}
          onProjectExpand={vi.fn()}
        />
      </NavigationProvider>
    );

    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('should toggle project expansion on click', () => {
    const onProjectExpand = vi.fn();

    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={mockProjects}
          videos={mockVideos}
          loading={false}
          onProjectExpand={onProjectExpand}
        />
      </NavigationProvider>
    );

    const projectItem = screen.getByText('Project Alpha');
    fireEvent.click(projectItem);

    expect(onProjectExpand).toHaveBeenCalledWith('1');
  });

  it('should render videos when project expanded', () => {
    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={mockProjects}
          videos={mockVideos}
          loading={false}
          expandedProjects={new Set(['1'])}
          onProjectExpand={vi.fn()}
        />
      </NavigationProvider>
    );

    expect(screen.getByText('Video 1')).toBeInTheDocument();
    expect(screen.getByText('Video 2')).toBeInTheDocument();
  });

  it('should call onProjectExpand when project clicked', () => {
    const onProjectExpand = vi.fn();

    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={mockProjects}
          videos={mockVideos}
          loading={false}
          onProjectExpand={onProjectExpand}
        />
      </NavigationProvider>
    );

    const projectAlpha = screen.getByText('Project Alpha');
    fireEvent.click(projectAlpha);

    expect(onProjectExpand).toHaveBeenCalledWith('1');
  });

  it('should display loading state', () => {
    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={[]}
          videos={{}}
          loading={true}
          onProjectExpand={vi.fn()}
        />
      </NavigationProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display error state', () => {
    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={[]}
          videos={{}}
          loading={false}
          error="Failed to load projects"
          onProjectExpand={vi.fn()}
        />
      </NavigationProvider>
    );

    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
  });

  it('should collapse sidebar when toggle clicked', () => {
    const { container } = render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={mockProjects}
          videos={mockVideos}
          loading={false}
          onProjectExpand={vi.fn()}
        />
      </NavigationProvider>
    );

    const sidebar = container.querySelector('.nav-sidebar');
    const toggleButton = container.querySelector('.nav-toggle');

    fireEvent.click(toggleButton!);

    expect(sidebar).toHaveClass('nav-sidebar--collapsed');
  });

  // CSS Contract Validation Tests (code-review-specialist remediation)
  describe('CSS class validation', () => {
    it('should use defined CSS classes for project structure', () => {
      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={mockProjects}
            videos={mockVideos}
            loading={false}
            expandedProjects={new Set(['1'])}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify correct BEM structure matching CSS
      expect(container.querySelector('.nav-project')).toBeInTheDocument();
      expect(container.querySelector('.nav-project-item')).toBeInTheDocument();
      expect(container.querySelector('.nav-project-info')).toBeInTheDocument();
      expect(container.querySelector('.nav-project-icon')).toBeInTheDocument();
      expect(container.querySelector('.nav-project-expand')).toBeInTheDocument();
    });

    it('should use defined CSS classes for video structure', () => {
      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={mockProjects}
            videos={mockVideos}
            loading={false}
            expandedProjects={new Set(['1'])}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify video structure matches CSS
      expect(container.querySelector('.nav-video-list')).toBeInTheDocument();
      expect(container.querySelector('.nav-video-item')).toBeInTheDocument();
      expect(container.querySelector('.nav-video-info')).toBeInTheDocument();
      expect(container.querySelector('.nav-video-title')).toBeInTheDocument();
    });

    it('should apply correct status classes (status-ready, not nav-video-status--ready)', () => {
      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={mockProjects}
            videos={mockVideos}
            loading={false}
            expandedProjects={new Set(['1'])}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify status classes match CSS (status-ready, NOT nav-video-status--ready)
      const statusIndicator = container.querySelector('.status-ready, .status-processing, .status-pending');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  // Essential UX Features (code-review-specialist blocking issues)
  describe('Essential UX features', () => {
    it('should display video count for projects', () => {
      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={mockProjects}
            videos={mockVideos}
            loading={false}
            expandedProjects={new Set(['1'])}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify metadata display (2 videos in PA001)
      expect(container.textContent).toContain('2 videos');
    });

    it('should display stream status metadata for videos', () => {
      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={mockProjects}
            videos={mockVideos}
            loading={false}
            expandedProjects={new Set(['1'])}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify stream status metadata displayed
      expect(container.querySelector('.nav-video-meta')).toBeInTheDocument();
    });

    it('should display due date when present', () => {
      const projectsWithDueDate = [
        { id: '1', title: 'Project Alpha', eav_code: 'PA001', due_date: '2025-12-31' },
      ];

      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={projectsWithDueDate}
            videos={mockVideos}
            loading={false}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify due date renders in project metadata
      expect(container.textContent).toContain('2025-12-31');
    });

    it('should show status indicator for video stream health', () => {
      const { container } = render(
        <NavigationProvider>
          <HierarchicalNavigationSidebar
            projects={mockProjects}
            videos={mockVideos}
            loading={false}
            expandedProjects={new Set(['1'])}
            onProjectExpand={vi.fn()}
          />
        </NavigationProvider>
      );

      // Verify status dot exists
      expect(container.querySelector('.nav-video-status')).toBeInTheDocument();
    });
  });
});
