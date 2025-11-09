/**
 * Navigation Module Barrel Export
 *
 * Provides clean import path for navigation functionality:
 * @example
 * import { NavigationProvider, useNavigation, Project, Video } from '@elevanaltd/shared-lib/navigation'
 *
 * Or via main barrel:
 * @example
 * import { NavigationProvider, useNavigation } from '@elevanaltd/shared-lib'
 */

// Export all types from NavigationContext
export type { Project, Video, NavigationContextType } from './NavigationContext.js'

// Export provider and hook from NavigationProvider
export { NavigationProvider, useNavigation } from './NavigationProvider.js'
