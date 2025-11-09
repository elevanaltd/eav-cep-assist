import React from 'react'
import './Header.css'

/**
 * Shared Header Component
 *
 * Provides consistent header layout across all EAV apps.
 * Fixed header with 3-column grid layout:
 * [Title] [SavedStatus - Time] [UserEmail] [Settings]
 *
 * Props:
 * - title: string (per-app title, e.g. "EAV Orchestrator", "Script Editor", "Scene Planning")
 * - userEmail?: string (current user's email, passed by app)
 * - lastSaved?: Date (app passes save timestamp, UI formats it)
 * - onLogout: () => void (app handles auth logout)
 * - onSettings: () => void (app handles settings modal/drawer)
 */

export interface HeaderProps {
  title: string
  userEmail?: string
  lastSaved?: Date
  onSettings: () => void
}

export function Header({
  title,
  userEmail,
  lastSaved,
  onSettings,
}: HeaderProps): React.ReactElement {
  const formatSaveTime = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <header className="app-header">
      {/* LEFT: Title (App-configurable) */}
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      {/* CENTER: Save Status (Identical styling, app configures logic) */}
      <div className="header-center">
        {lastSaved && (
          <div className="save-status">
            <span className="save-label">Saved</span>
            <span className="save-time">{formatSaveTime(lastSaved)}</span>
          </div>
        )}
      </div>

      {/* RIGHT: User Controls */}
      <div className="header-right">
        {/* Auth Display - IDENTICAL across apps */}
        {userEmail && (
          <div className="user-info">
            <span className="user-email">{userEmail}</span>
          </div>
        )}

        {/* Settings Button - ALWAYS shown, STYLE identical, content app-specific */}
        <button
          className="settings-button-plain"
          onClick={onSettings}
          type="button"
          aria-label="Settings"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  )
}
