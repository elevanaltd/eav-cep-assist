import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from './Header'

/**
 * Test Suite: Header Component
 *
 * Validates shared Header component extracted from scenes-web-demo-1
 * for use across all EAV apps.
 *
 * Requirements:
 * - Identical layout across all apps
 * - App-configurable title, save status, logout, settings
 * - Responsive design
 */

describe('Header Component', () => {
  it('should render header with title, save status, user email, and settings button', () => {
    render(
      <Header
        title="Scene Planning"
        userEmail="shaun.buswell@elevana.com"
        lastSaved={new Date(Date.now() - 5000)} // 5 seconds ago
        onSettings={vi.fn()}
      />
    )

    // Title (left)
    expect(screen.getByText('Scene Planning')).toBeInTheDocument()

    // Save status (center)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText(/ago/)).toBeInTheDocument() // "5s ago"

    // User email (right)
    expect(screen.getByText(/shaun\.buswell@elevana\.com/)).toBeInTheDocument()

    // Settings button (right) - always shown
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('should call onSettings when settings button clicked', async () => {
    const onSettings = vi.fn()
    const user = userEvent.setup()

    render(<Header title="Test" onSettings={onSettings} />)

    const settingsBtn = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsBtn)

    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('should format save time correctly', () => {
    const scenarios = [
      { label: '5 seconds ago', offset: 5000, expected: /5s ago/ },
      { label: '3 minutes ago', offset: 3 * 60 * 1000, expected: /3m ago/ },
      { label: '2 hours ago', offset: 2 * 60 * 60 * 1000, expected: /2h ago/ },
    ]

    scenarios.forEach(({ label, offset, expected }) => {
      const { unmount } = render(
        <Header title="Test" lastSaved={new Date(Date.now() - offset)} onSettings={vi.fn()} />
      )

      expect(screen.getByText(expected), `Should show "${label}"`).toBeInTheDocument()
      unmount()
    })
  })

  it('should not show save status when lastSaved not provided', () => {
    render(<Header title="Test" onSettings={vi.fn()} />)

    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('should support app-specific titles', () => {
    const titles = ['Script Editor', 'Scene Planning', 'Voice Over Manager', 'Edit Guide']

    titles.forEach((title) => {
      const { unmount } = render(<Header title={title} onSettings={vi.fn()} />)

      expect(screen.getByText(title)).toBeInTheDocument()
      unmount()
    })
  })

  describe('Layout & Structure', () => {
    it('should have fixed header layout with three zones', () => {
      render(<Header title="Test App" lastSaved={new Date()} onSettings={vi.fn()} />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('app-header')

      const headerLeft = header.querySelector('.header-left')
      const headerCenter = header.querySelector('.header-center')
      const headerRight = header.querySelector('.header-right')

      expect(headerLeft).toBeInTheDocument()
      expect(headerCenter).toBeInTheDocument()
      expect(headerRight).toBeInTheDocument()
    })

    it('should position elements in correct order: left (title), center (save), right (user/settings)', () => {
      const { container } = render(
        <Header title="Test" lastSaved={new Date()} onSettings={vi.fn()} />
      )

      const header = container.querySelector('.app-header')
      const children = Array.from(header?.children || [])

      expect(children[0]).toHaveClass('header-left')
      expect(children[1]).toHaveClass('header-center')
      expect(children[2]).toHaveClass('header-right')
    })
  })

  describe('Styling Consistency', () => {
    it('should apply consistent button styling to settings button', () => {
      render(<Header title="Test" onSettings={vi.fn()} />)

      const settingsBtn = screen.getByRole('button', { name: /settings/i })
      expect(settingsBtn).toHaveClass('settings-button-plain')
    })

    it('should display save status with consistent styling', () => {
      render(<Header title="Test" lastSaved={new Date()} onSettings={vi.fn()} />)

      const saveStatus = screen.getByText('Saved').closest('.save-status')
      expect(saveStatus).toBeInTheDocument()
      expect(saveStatus?.querySelector('.save-label')).toBeInTheDocument()
      expect(saveStatus?.querySelector('.save-time')).toBeInTheDocument()
    })
  })
})
