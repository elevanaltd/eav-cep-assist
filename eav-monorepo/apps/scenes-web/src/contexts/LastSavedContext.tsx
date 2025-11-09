import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface LastSavedContextType {
  lastSaved: Date | null
  recordSave: () => void
  formattedLastSaved: string
}

const LastSavedContext = createContext<LastSavedContextType | undefined>(undefined)

export function LastSavedProvider({ children }: { children: ReactNode }) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [formattedLastSaved, setFormattedLastSaved] = useState<string>('')

  const recordSave = () => {
    setLastSaved(new Date())
  }

  // Update formatted timestamp every second to show relative time (e.g., "2 minutes ago")
  useEffect(() => {
    const updateFormatted = () => {
      if (!lastSaved) {
        setFormattedLastSaved('Never')
        return
      }

      const now = new Date()
      const diffMs = now.getTime() - lastSaved.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      const diffHours = Math.floor(diffMinutes / 60)

      if (diffSeconds < 60) {
        setFormattedLastSaved(`${diffSeconds}s ago`)
      } else if (diffMinutes < 60) {
        setFormattedLastSaved(`${diffMinutes}m ago`)
      } else if (diffHours < 24) {
        setFormattedLastSaved(`${diffHours}h ago`)
      } else {
        setFormattedLastSaved(lastSaved.toLocaleDateString())
      }
    }

    updateFormatted()
    const interval = setInterval(updateFormatted, 1000)

    return () => clearInterval(interval)
  }, [lastSaved])

  return (
    <LastSavedContext.Provider value={{ lastSaved, recordSave, formattedLastSaved }}>
      {children}
    </LastSavedContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLastSaved() {
  const context = useContext(LastSavedContext)
  if (!context) {
    throw new Error('useLastSaved must be used within LastSavedProvider')
  }
  return context
}
