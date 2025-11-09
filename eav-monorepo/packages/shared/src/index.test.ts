import { describe, it, expect } from 'vitest'

describe('@elevanaltd/shared', () => {
  it('should export client module utilities', async () => {
    const { createBrowserClient } = await import('./lib/client/index.js')
    expect(createBrowserClient).toBeDefined()
  })

  it('should export authentication utilities', async () => {
    const { getSession, signIn, signOut, signUp, onAuthStateChange } = await import('./lib/auth/index.js')
    expect(getSession).toBeDefined()
    expect(signIn).toBeDefined()
    expect(signOut).toBeDefined()
    expect(signUp).toBeDefined()
    expect(onAuthStateChange).toBeDefined()
  })

  it('should export RLS utilities', async () => {
    const { buildClientQuery } = await import('./lib/rls/index.js')
    expect(buildClientQuery).toBeDefined()
  })

  it('should export navigation provider', async () => {
    const { NavigationProvider, useNavigation } = await import('./index.js')
    expect(NavigationProvider).toBeDefined()
    expect(useNavigation).toBeDefined()
  })

  it('should export UI components', async () => {
    const { Header, AutocompleteField, HierarchicalNavigationSidebar } = await import('./index.js')
    expect(Header).toBeDefined()
    expect(AutocompleteField).toBeDefined()
    expect(HierarchicalNavigationSidebar).toBeDefined()
  })

  it('should export dropdown context', async () => {
    const { DropdownProvider, useDropdown } = await import('./index.js')
    expect(DropdownProvider).toBeDefined()
    expect(useDropdown).toBeDefined()
  })
})
