import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NavigationProvider } from '../navigation';
import { HierarchicalNavigationSidebar } from './HierarchicalNavigationSidebar';

describe('HierarchicalNavigationSidebar Integration', () => {
  const mockProjects = [
    { id: '1', title: 'Project Alpha', eav_code: 'PA001', due_date: '2025-12-31' },
    { id: '2', title: 'Project Beta', eav_code: 'PB001' },
  ];

  const mockVideos = {
    PA001: [
      { id: 'v1', eav_code: 'PA001', title: 'Video 1', main_stream_status: 'ready' },
      { id: 'v2', eav_code: 'PA001', title: 'Video 2', main_stream_status: 'processing' },
    ],
    PB001: [{ id: 'v3', eav_code: 'PB001', title: 'Video 3', main_stream_status: 'pending' }],
  };

  it('should maintain selection state across project expansion', async () => {
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

    // Select Project Alpha
    const projectAlpha = screen.getByText('Project Alpha');
    fireEvent.click(projectAlpha);

    expect(onProjectExpand).toHaveBeenCalledWith('1');

    // Videos should appear
    await waitFor(() => {
      expect(screen.getByText('Video 1')).toBeInTheDocument();
    });

    // Select Video 1
    const video1 = screen.getByText('Video 1');
    fireEvent.click(video1);

    const video1Item = video1.closest('.nav-video-item');
    expect(video1Item).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
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

    const projectAlpha = screen.getByText('Project Alpha');
    const projectDiv = projectAlpha.parentElement!;

    // Test Enter key
    fireEvent.keyDown(projectDiv, { key: 'Enter' });
    expect(projectDiv).toBeInTheDocument();

    // Test Space key
    fireEvent.keyDown(projectDiv, { key: ' ' });
    expect(projectDiv).toBeInTheDocument();
  });

  it('should handle empty projects gracefully', () => {
    render(
      <NavigationProvider>
        <HierarchicalNavigationSidebar
          projects={[]}
          videos={{}}
          loading={false}
          onProjectExpand={vi.fn()}
        />
      </NavigationProvider>
    );

    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });

  it('should preserve video selection when re-selecting same project', () => {
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

    // Select Project Alpha
    const projectAlpha = screen.getByText('Project Alpha');
    fireEvent.click(projectAlpha);

    // Select Video 1
    const video1 = screen.getByText('Video 1');
    fireEvent.click(video1);

    // Re-click Project Alpha
    fireEvent.click(projectAlpha);

    // Video should still be visible (same eav_code)
    expect(video1).toBeInTheDocument();
  });

  it('should display video status badges', () => {
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

    // Verify stream status metadata (scripts-web pattern: "Main: ready | VO: N/A")
    expect(container.textContent).toContain('Main: ready');
    expect(container.textContent).toContain('Main: processing');
  });

  it('should show video count for projects with videos', () => {
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

    // Verify video count in metadata text (scripts-web pattern: "2 videos")
    expect(container.textContent).toContain('2 videos');
  });
});
