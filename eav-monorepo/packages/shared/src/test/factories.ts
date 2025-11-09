/**
 * Test Data Factories
 *
 * Provides test data builders with deterministic IDs.
 * IDs reset before each test to ensure predictable test data.
 *
 * Pattern extracted from: /Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/test/factories.ts
 * Adapted for: Monorepo with @workspace/shared package
 */

// ID counters for deterministic test data
let projectIdCounter = 1
let videoIdCounter = 1
let scriptIdCounter = 1
let commentIdCounter = 1
let userIdCounter = 1

/**
 * Reset all factory ID counters
 * Called in beforeEach from setup.ts to ensure deterministic test data
 */
export function resetFactoryIds() {
  projectIdCounter = 1
  videoIdCounter = 1
  scriptIdCounter = 1
  commentIdCounter = 1
  userIdCounter = 1
}

/**
 * Generate deterministic UUID for testing
 * Format: 00000000-0000-4000-8000-{typeHex}{counter}
 * Example: 00000000-0000-4000-8000-100000000001 (project 1)
 *
 * Type codes (hex): 1=project, 2=video, 3=script, 4=comment, 5=user
 * UUIDs must use valid hex characters (0-9, a-f), not letters like 'p', 's', etc.
 */
function generateTestUuid(typeHex: string, counter: number): string {
  const paddedCounter = counter.toString().padStart(11, '0')
  return `00000000-0000-4000-8000-${typeHex}${paddedCounter}`
}

/**
 * Generate sequential project ID
 */
export function projectId(): string {
  return generateTestUuid('1', projectIdCounter++)
}

/**
 * Generate sequential video ID
 */
export function videoId(): string {
  return generateTestUuid('2', videoIdCounter++)
}

/**
 * Generate sequential script ID
 */
export function scriptId(): string {
  return generateTestUuid('3', scriptIdCounter++)
}

/**
 * Generate sequential comment ID
 */
export function commentId(): string {
  return generateTestUuid('4', commentIdCounter++)
}

/**
 * Generate sequential user ID
 */
export function userId(): string {
  return generateTestUuid('5', userIdCounter++)
}

/**
 * Create mock project data
 */
export function mockProject(overrides?: Partial<{
  id: string
  title: string
  description: string
  created_at: string
  updated_at: string
}>) {
  const now = new Date().toISOString()
  return {
    id: projectId(),
    title: `Test Project ${projectIdCounter - 1}`,
    description: `Test project description ${projectIdCounter - 1}`,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Create mock video data
 */
export function mockVideo(overrides?: Partial<{
  id: string
  project_id: string
  title: string
  description: string
  created_at: string
  updated_at: string
}>) {
  const now = new Date().toISOString()
  return {
    id: videoId(),
    project_id: projectId(),
    title: `Test Video ${videoIdCounter - 1}`,
    description: `Test video description ${videoIdCounter - 1}`,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Create mock script data
 */
export function mockScript(overrides?: Partial<{
  id: string
  video_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}>) {
  const now = new Date().toISOString()
  return {
    id: scriptId(),
    video_id: videoId(),
    title: `Test Script ${scriptIdCounter - 1}`,
    content: `Test script content ${scriptIdCounter - 1}`,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Create mock comment data
 */
export function mockComment(overrides?: Partial<{
  id: string
  script_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}>) {
  const now = new Date().toISOString()
  return {
    id: commentId(),
    script_id: scriptId(),
    user_id: userId(),
    content: `Test comment ${commentIdCounter - 1}`,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Create mock user data
 */
export function mockUser(overrides?: Partial<{
  id: string
  email: string
  created_at: string
  updated_at: string
}>) {
  const now = new Date().toISOString()
  const currentUserId = userId()
  return {
    id: currentUserId,
    email: `test-user-${userIdCounter - 1}@example.com`,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Database Fixture Helpers
 *
 * These helpers create actual database records to satisfy foreign key constraints.
 * Use when tests need real DB relationships (e.g., comments → scripts FK).
 */

/**
 * Create a test script in the database
 *
 * Purpose: Satisfy FK constraints when creating comments
 * Note: scripts.video_id is nullable, so no need to create parent video/project records
 *
 * Uses crypto.randomUUID() to avoid collisions across test runs
 *
 * **SERVICE ROLE USAGE:**
 * This function uses service role client to bypass RLS circular dependency blocker.
 * RLS Issue: Comment INSERT → Scripts FK → Scripts RLS → user_accessible_scripts → Scripts query → RLS (LOOP)
 * Fix: Migration 20251102_fix_rls_circular_dependency.sql (parallel track)
 * Workaround: Service role for test fixtures (standard testing practice)
 * Validation: Business logic tests use authenticated client for capability-config validation
 * See: RLS-VALIDATION.md for future RLS-specific test suite
 *
 * @param overrides - Optional field overrides
 * @returns Created script ID
 */
export async function createTestScript(
  overrides?: Partial<{
    id: string
    video_id: string | null
    plain_text: string
    status: string
  }>
): Promise<string> {
  // Import here to avoid circular dependency issues
  const { getServiceClient } = await import('./supabase-test-client.js')
  const serviceClient = getServiceClient()

  // Use random UUID to avoid collisions across test runs
  const testScriptId = crypto.randomUUID()
  const scriptData = {
    id: testScriptId,
    video_id: null, // nullable - no FK constraint
    plain_text: `Test script content for ${testScriptId}`,
    status: 'draft',
    ...overrides,
  }

  const { error } = await serviceClient
    .from('scripts')
    .insert(scriptData)

  if (error) {
    throw new Error(`Failed to create test script: ${error.message}`)
  }

  return testScriptId
}
