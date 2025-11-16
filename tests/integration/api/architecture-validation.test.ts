/**
 * Architecture Validation API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupTestServer, teardownTestServer } from '../helpers/test-server.js';
import { ApiTestClient } from '../helpers/api-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PROJECT_PATH = path.resolve(__dirname, '../fixtures/test-project');

describe('Architecture Validation API', () => {
  let client: ApiTestClient;

  beforeAll(async () => {
    const { app } = await setupTestServer();
    client = new ApiTestClient(app);
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  describe('POST /api/projections/modules/validate', () => {
    it('should reject request without rootPath', async () => {
      const response = await client.post('/api/projections/modules/validate', {});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate a project and return score', async () => {
      const response = await client.post('/api/projections/modules/validate', {
        rootPath: TEST_PROJECT_PATH
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('grade');

      // Score should be 0-100
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);

      // Grade should be A+, A, B, C, D, or F
      expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(response.body.data.grade);
    }, 30000);

    it('should include validation checks', async () => {
      const response = await client.post('/api/projections/modules/validate', {
        rootPath: TEST_PROJECT_PATH
      });

      expect(response.body.data).toHaveProperty('checks');
      expect(typeof response.body.data.checks).toBe('object');

      // Should have standard checks
      const checks = response.body.data.checks;
      expect(checks).toHaveProperty('domainIndependence');
      expect(checks).toHaveProperty('layeredArchitecture');
      expect(checks).toHaveProperty('noCycles');
    }, 30000);
  });
});


