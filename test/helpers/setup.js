// Vitest global setup
// Runs before all tests

import { beforeEach, afterEach } from 'vitest';

// Reset mocks before each test
beforeEach(() => {
  // Clear any global state
  if (global.csInterface) {
    delete global.csInterface;
  }
});

// Cleanup after each test
afterEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
});
