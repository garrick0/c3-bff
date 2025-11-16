/**
 * Test Server
 * Creates and manages test server instance
 */

import express from 'express';
import { createApp } from '../../../src/app.js';
import { bootstrap } from 'c3-wiring';

let testApp: express.Application | null = null;
let testContainer: any = null;

export async function setupTestServer() {
  if (testApp) {
    return { app: testApp, container: testContainer! };
  }

  // Use full bootstrap to avoid import issues
  testContainer = await bootstrap();

  // Create app
  testApp = createApp(testContainer);

  return { app: testApp, container: testContainer };
}

export async function teardownTestServer() {
  testApp = null;
  testContainer = null;
}

export function getTestApp() {
  if (!testApp) {
    throw new Error('Test server not set up. Call setupTestServer() first.');
  }
  return testApp;
}

