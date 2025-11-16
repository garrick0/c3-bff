/**
 * Test Setup
 * Global setup for all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Global test timeout
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  console.log('✅ Test suite complete');
});

afterEach(() => {
  // Clean up after each test
});


