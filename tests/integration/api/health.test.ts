/**
 * Health Check API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestServer, teardownTestServer, getTestApp } from '../helpers/test-server.js';
import { ApiTestClient } from '../helpers/api-client.js';

describe('Health Check API', () => {
  let client: ApiTestClient;

  beforeAll(async () => {
    const { app } = await setupTestServer();
    client = new ApiTestClient(app);
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await client.healthCheck();

      expect(response.status).toBe(200);
    });

    it('should return correct response structure', async () => {
      const response = await client.healthCheck();

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return JSON content type', async () => {
      const response = await client.healthCheck();

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});


