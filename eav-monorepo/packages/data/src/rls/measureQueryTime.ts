/**
 * Measure Query Time - Performance Benchmarking Utility
 * Pattern extracted from scripts-web MVP (proven <50ms benchmark)
 *
 * PURPOSE: Measure query execution time for performance optimization
 * BASELINE: scripts-web maintains <50ms query performance with InitPlan RLS
 *
 * @example
 * ```typescript
 * const { result, timeMs } = await measureQueryTime(async () => {
 *   return await supabase.from('comments').select('*').eq('script_id', scriptId)
 * })
 *
 * console.log(`Query executed in ${timeMs}ms`)
 * if (timeMs > 50) {
 *   console.warn('Performance degradation detected')
 * }
 * ```
 */

/**
 * Measure execution time of an async operation
 *
 * @param operation - Async function to measure
 * @returns Object containing result and execution time in milliseconds
 */
export async function measureQueryTime<T>(
  operation: () => Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const startTime = Date.now()
  const result = await operation()
  const timeMs = Date.now() - startTime

  return { result, timeMs }
}
