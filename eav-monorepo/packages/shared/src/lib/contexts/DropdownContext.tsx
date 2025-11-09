import { createContext, useContext, useState, ReactNode } from 'react'

interface DropdownContextType {
  activeDropdownId: string | null
  setActiveDropdownId: (id: string | null) => void
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined)

export function DropdownProvider({ children }: { children: ReactNode }) {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

  return (
    <DropdownContext.Provider value={{ activeDropdownId, setActiveDropdownId }}>
      {children}
    </DropdownContext.Provider>
  )
}

export function useDropdown() {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('useDropdown must be used within DropdownProvider')
  }
  return context
}
