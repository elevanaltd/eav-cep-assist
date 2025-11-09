/**
 * Errors Module - Error handling and retry logic
 *
 * Barrel export for @workspace/shared/errors
 * Provides comprehensive error handling, retry mechanisms, and user-friendly error messages
 */

// Error categorization and handling
export {
  categorizeError,
  shouldRetryError,
  getUserFriendlyErrorMessage,
  sanitizeErrorForLogging,
  withRetry,
  makeRetryable,
  setupGlobalErrorHandling
} from './errorHandling.js';

// React hooks
export { useErrorHandling } from './errorHandling.js';

// Types and classes
export type { RetryConfig, ErrorInfo } from './errorHandling.js';
export { AsyncErrorBoundary } from './errorHandling.js';
