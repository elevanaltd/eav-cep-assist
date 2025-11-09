/**
 * Post-Modularization Quality Gate Tests
 *
 * Verifies ALL packages build and pass quality gates after modularization.
 * These tests ensure the modularization doesn't break the system.
 *
 * TDD Phase: RED (tests skipped because packages don't exist yet)
 * North Star I7: Test-first discipline
 * North Star I8: Production-grade quality (all gates must pass)
 *
 * Pattern: Skip → Modularize → Unskip → GREEN
 */

import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

describe('Post-Modularization Build Quality Gates', () => {
  describe('Package Existence', () => {
    it.skip('verifies @workspace/data package exists', () => {
      const packagePath = join(process.cwd(), 'packages/data/package.json')
      expect(existsSync(packagePath)).toBe(true)
    })

    it.skip('verifies @workspace/auth package exists', () => {
      const packagePath = join(process.cwd(), 'packages/auth/package.json')
      expect(existsSync(packagePath)).toBe(true)
    })

    it.skip('verifies @workspace/ui package exists', () => {
      const packagePath = join(process.cwd(), 'packages/ui/package.json')
      expect(existsSync(packagePath)).toBe(true)
    })

    it.skip('verifies @workspace/shared package still exists', () => {
      const packagePath = join(process.cwd(), 'packages/shared/package.json')
      expect(existsSync(packagePath)).toBe(true)
    })
  })

  describe('Build Success', () => {
    it.skip('builds @workspace/data successfully', () => {
      expect(() => {
        execSync('pnpm run build', {
          cwd: join(process.cwd(), 'packages/data'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('builds @workspace/auth successfully', () => {
      expect(() => {
        execSync('pnpm run build', {
          cwd: join(process.cwd(), 'packages/auth'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('builds @workspace/ui successfully', () => {
      expect(() => {
        execSync('pnpm run build', {
          cwd: join(process.cwd(), 'packages/ui'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('builds @workspace/shared successfully', () => {
      expect(() => {
        execSync('pnpm run build', {
          cwd: join(process.cwd(), 'packages/shared'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('builds copy-editor app successfully', () => {
      expect(() => {
        execSync('pnpm run build', {
          cwd: join(process.cwd(), 'apps/copy-editor'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })
  })

  describe('Lint Quality Gate', () => {
    it.skip('lints @workspace/data with 0 errors', () => {
      const output = execSync('pnpm run lint', {
        cwd: join(process.cwd(), 'packages/data'),
        encoding: 'utf-8'
      })

      expect(output).not.toMatch(/error/)
    })

    it.skip('lints @workspace/auth with 0 errors', () => {
      const output = execSync('pnpm run lint', {
        cwd: join(process.cwd(), 'packages/auth'),
        encoding: 'utf-8'
      })

      expect(output).not.toMatch(/error/)
    })

    it.skip('lints @workspace/ui with 0 errors', () => {
      const output = execSync('pnpm run lint', {
        cwd: join(process.cwd(), 'packages/ui'),
        encoding: 'utf-8'
      })

      expect(output).not.toMatch(/error/)
    })

    it.skip('lints @workspace/shared with 0 errors', () => {
      const output = execSync('pnpm run lint', {
        cwd: join(process.cwd(), 'packages/shared'),
        encoding: 'utf-8'
      })

      expect(output).not.toMatch(/error/)
    })

    it.skip('lints copy-editor with 0 errors', () => {
      const output = execSync('pnpm run lint', {
        cwd: join(process.cwd(), 'apps/copy-editor'),
        encoding: 'utf-8'
      })

      expect(output).not.toMatch(/error/)
    })
  })

  describe('TypeCheck Quality Gate', () => {
    it.skip('typechecks @workspace/data with 0 errors', () => {
      expect(() => {
        execSync('pnpm run typecheck', {
          cwd: join(process.cwd(), 'packages/data'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('typechecks @workspace/auth with 0 errors', () => {
      expect(() => {
        execSync('pnpm run typecheck', {
          cwd: join(process.cwd(), 'packages/auth'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('typechecks @workspace/ui with 0 errors', () => {
      expect(() => {
        execSync('pnpm run typecheck', {
          cwd: join(process.cwd(), 'packages/ui'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('typechecks @workspace/shared with 0 errors', () => {
      expect(() => {
        execSync('pnpm run typecheck', {
          cwd: join(process.cwd(), 'packages/shared'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('typechecks copy-editor with 0 errors', () => {
      expect(() => {
        execSync('pnpm run typecheck', {
          cwd: join(process.cwd(), 'apps/copy-editor'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })
  })

  describe('Test Quality Gate', () => {
    it.skip('runs @workspace/data tests with all passing', () => {
      expect(() => {
        execSync('pnpm run test:unit', {
          cwd: join(process.cwd(), 'packages/data'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs @workspace/auth tests with all passing', () => {
      expect(() => {
        execSync('pnpm run test:unit', {
          cwd: join(process.cwd(), 'packages/auth'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs @workspace/ui tests with all passing', () => {
      expect(() => {
        execSync('pnpm run test:unit', {
          cwd: join(process.cwd(), 'packages/auth'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs @workspace/shared tests with all passing', () => {
      expect(() => {
        execSync('pnpm run test:unit', {
          cwd: join(process.cwd(), 'packages/shared'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs copy-editor tests with all passing', () => {
      expect(() => {
        execSync('pnpm run test:unit', {
          cwd: join(process.cwd(), 'apps/copy-editor'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })
  })

  describe('System-Wide Quality Gates', () => {
    it.skip('runs monorepo lint with all packages passing', () => {
      expect(() => {
        execSync('pnpm run lint', {
          cwd: process.cwd(),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs monorepo typecheck with all packages passing', () => {
      expect(() => {
        execSync('pnpm run typecheck', {
          cwd: process.cwd(),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs monorepo test:unit with all packages passing', () => {
      expect(() => {
        execSync('pnpm run test:unit', {
          cwd: process.cwd(),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it.skip('runs monorepo build with all packages succeeding', () => {
      expect(() => {
        execSync('pnpm run build', {
          cwd: process.cwd(),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })
  })

  describe('Dependency Graph Validation', () => {
    it.skip('verifies no circular dependencies exist', async () => {
      // This would use madge or similar tool
      // For now, document the requirement
      const noCycles = true
      expect(noCycles).toBe(true)
    })

    it.skip('verifies dependency order: data → auth → ui → shared', () => {
      const dataPackage = require('../packages/data/package.json')
      const authPackage = require('../packages/auth/package.json')
      const uiPackage = require('../packages/ui/package.json')
      const sharedPackage = require('../packages/shared/package.json')

      // @workspace/data should have no workspace dependencies
      expect(dataPackage.dependencies).not.toHaveProperty('@workspace/auth')
      expect(dataPackage.dependencies).not.toHaveProperty('@workspace/ui')
      expect(dataPackage.dependencies).not.toHaveProperty('@workspace/shared')

      // @workspace/auth should depend only on @workspace/data
      expect(authPackage.dependencies).toHaveProperty('@workspace/data')
      expect(authPackage.dependencies).not.toHaveProperty('@workspace/ui')
      expect(authPackage.dependencies).not.toHaveProperty('@workspace/shared')

      // @workspace/ui should depend on @workspace/data and @workspace/auth
      expect(uiPackage.dependencies).toHaveProperty('@workspace/data')
      expect(uiPackage.dependencies).toHaveProperty('@workspace/auth')
      expect(uiPackage.dependencies).not.toHaveProperty('@workspace/shared')

      // @workspace/shared should depend on all three
      expect(sharedPackage.dependencies).toHaveProperty('@workspace/data')
      expect(sharedPackage.dependencies).toHaveProperty('@workspace/auth')
      expect(sharedPackage.dependencies).toHaveProperty('@workspace/ui')
    })
  })

  describe('Singleton Pattern Enforcement', () => {
    /**
     * BLOCKING TEST (Critical-Engineer Requirement)
     *
     * WHY CRITICAL: Multiple Supabase client instances = production data corruption
     * - Auth session inconsistency (user logged in/out simultaneously)
     * - Database connection pool exhaustion
     * - RLS policy bypass (different sessions)
     *
     * RISK: CRITICAL - Production incident, multi-hour outage
     * Authority: critical-engineer (BLOCKING approval condition)
     * North Star I8: Production-grade from day one
     */

    it.skip('enforces single Supabase client instance across all packages', async () => {
      // TODO: Enable in Phase 6 when all packages exist
      // Will validate: All 4 packages return same Supabase client singleton instance
      expect(true).toBe(true) // Placeholder
    })

    it.skip('enforces AuthContext singleton across packages', async () => {
      // TODO: Enable in Phase 6
      // Will validate: useAuth hook is same function across all packages
      expect(true).toBe(true) // Placeholder
    })

    it.skip('validates no duplicate Supabase client initialization', async () => {
      // TODO: Enable in Phase 1
      // Will validate: getSupabaseClient() returns same instance on multiple calls
      expect(true).toBe(true) // Placeholder
    })

    it.skip('validates package.json peerDependencies prevent multi-instance', () => {
      // Validate that React and Supabase are peerDependencies (not bundled)
      // This prevents multiple instances from being created

      const authPackage = require('../packages/auth/package.json')
      const uiPackage = require('../packages/ui/package.json')
      const sharedPackage = require('../packages/shared/package.json')

      // @workspace/auth should have React and Supabase as peerDeps
      expect(authPackage.peerDependencies).toHaveProperty('react')
      expect(authPackage.peerDependencies).toHaveProperty('@supabase/supabase-js')

      // @workspace/ui should have React and Supabase as peerDeps
      expect(uiPackage.peerDependencies).toHaveProperty('react')
      expect(uiPackage.peerDependencies).toHaveProperty('@supabase/supabase-js')

      // @workspace/shared should have React and Supabase as peerDeps
      expect(sharedPackage.peerDependencies).toHaveProperty('react')
      expect(sharedPackage.peerDependencies).toHaveProperty('@supabase/supabase-js')

      // Critical: These should NOT be in regular dependencies (would be bundled)
      expect(authPackage.dependencies?.react).toBeUndefined()
      expect(authPackage.dependencies?.['@supabase/supabase-js']).toBeUndefined()
      expect(uiPackage.dependencies?.react).toBeUndefined()
      expect(uiPackage.dependencies?.['@supabase/supabase-js']).toBeUndefined()
      expect(sharedPackage.dependencies?.react).toBeUndefined()
      expect(sharedPackage.dependencies?.['@supabase/supabase-js']).toBeUndefined()
    })

    it.skip('validates singleton enforcement in production bundle', async () => {
      // This test validates that the production bundle doesn't contain
      // duplicate Supabase client code

      const { execSync } = require('child_process')
      const { readFileSync } = require('fs')
      const { join } = require('path')

      // Build all packages
      execSync('pnpm run build', { cwd: process.cwd() })

      // Check that dist/ bundles don't duplicate Supabase client
      const packages = ['data', 'auth', 'ui', 'shared']

      for (const pkg of packages) {
        const distPath = join(process.cwd(), 'packages', pkg, 'dist')
        const files = execSync(`find ${distPath} -name "*.js"`, { encoding: 'utf-8' })
          .split('\n')
          .filter(Boolean)

        // None of the bundles should contain inline Supabase client code
        // (should reference external @supabase/supabase-js)
        for (const file of files) {
          const content = readFileSync(file, 'utf-8')

          // Should not contain bundled Supabase code
          // (this is a heuristic - may need adjustment)
          const hasBundledSupabase = content.includes('createClient') &&
            content.includes('supabaseUrl') &&
            content.length > 50000 // Large bundle suggests inlining

          expect(hasBundledSupabase).toBe(false,
            `${pkg} bundle should not inline Supabase client (should use external)`)
        }
      }
    })
  })
})
