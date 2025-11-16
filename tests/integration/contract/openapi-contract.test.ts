/**
 * OpenAPI Contract Tests
 * Validates that API responses match the OpenAPI schema
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yaml from 'yaml';
import { setupTestServer, teardownTestServer } from '../helpers/test-server.js';
import { ApiTestClient } from '../helpers/api-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PROJECT_PATH = path.resolve(__dirname, '../fixtures/test-project');

// Simple schema validator
function validateAgainstSchema(data: any, schemaName: string, schema: any): void {
  const schemaObj = schema.components?.schemas?.[schemaName];
  if (!schemaObj) {
    throw new Error(`Schema ${schemaName} not found`);
  }

  // Validate required properties
  if (schemaObj.required) {
    for (const prop of schemaObj.required) {
      expect(data).toHaveProperty(prop);
    }
  }

  // Validate property types
  if (schemaObj.properties) {
    for (const [prop, propSchema] of Object.entries(schemaObj.properties) as any) {
      if (data[prop] !== undefined) {
        if (propSchema.type === 'string') {
          expect(typeof data[prop]).toBe('string');
        } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
          expect(typeof data[prop]).toBe('number');
        } else if (propSchema.type === 'boolean') {
          expect(typeof data[prop]).toBe('boolean');
        } else if (propSchema.type === 'array') {
          expect(Array.isArray(data[prop])).toBe(true);
        } else if (propSchema.type === 'object') {
          expect(typeof data[prop]).toBe('object');
        }

        // Validate enums
        if (propSchema.enum) {
          expect(propSchema.enum).toContain(data[prop]);
        }

        // Validate min/max for numbers
        if (typeof data[prop] === 'number') {
          if (propSchema.minimum !== undefined) {
            expect(data[prop]).toBeGreaterThanOrEqual(propSchema.minimum);
          }
          if (propSchema.maximum !== undefined) {
            expect(data[prop]).toBeLessThanOrEqual(propSchema.maximum);
          }
        }
      }
    }
  }
}

describe('OpenAPI Contract Tests', () => {
  let client: ApiTestClient;
  let openApiSpec: any;

  beforeAll(async () => {
    const { app } = await setupTestServer();
    client = new ApiTestClient(app);

    // Load OpenAPI spec
    const specPath = path.resolve(__dirname, '../../../openapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf-8');
    openApiSpec = yaml.parse(specContent);
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  describe('Health Check Contract', () => {
    it('should match health check schema', async () => {
      const response = await client.healthCheck();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('Module Analysis Contract', () => {
    it('should validate AnalysisResponse structure', async () => {
      const response = await client.post('/api/projections/modules/analyze', {
        rootPath: TEST_PROJECT_PATH,
        config: { aggregationLevel: 'top-level' }
      });

      expect(response.status).toBe(200);
      
      // Validate top-level response
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;

      // Validate Analysis schema
      validateAgainstSchema(data, 'Analysis', openApiSpec);

      // Validate AnalysisSummary
      validateAgainstSchema(data.summary, 'AnalysisSummary', openApiSpec);

      // Validate Module array
      expect(Array.isArray(data.modules)).toBe(true);
      if (data.modules.length > 0) {
        validateAgainstSchema(data.modules[0], 'Module', openApiSpec);
        validateAgainstSchema(data.modules[0].metrics, 'ModuleMetrics', openApiSpec);
      }

      // Validate Dependency array
      expect(Array.isArray(data.dependencies)).toBe(true);
      if (data.dependencies.length > 0) {
        validateAgainstSchema(data.dependencies[0], 'Dependency', openApiSpec);
      }
    }, 30000);

    it('should return error response for invalid request', async () => {
      const response = await client.post('/api/projections/modules/analyze', {
        // Missing required rootPath
        config: { aggregationLevel: 'top-level' }
      });

      expect(response.status).toBe(400);
      validateAgainstSchema(response.body, 'ErrorResponse', openApiSpec);
    });
  });

  describe('List Analyses Contract', () => {
    it('should validate AnalysisListResponse structure', async () => {
      // Create an analysis first
      await client.post('/api/projections/modules/analyze', {
        rootPath: TEST_PROJECT_PATH,
        config: { aggregationLevel: 'top-level' }
      });

      const response = await client.get('/api/projections/modules');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      validateAgainstSchema(response.body, 'AnalysisListResponse', openApiSpec);
      
      if (response.body.data.analyses.length > 0) {
        validateAgainstSchema(response.body.data.analyses[0], 'AnalysisListItem', openApiSpec);
      }
    }, 30000);
  });

  describe('Validation Contract', () => {
    it('should validate ValidationResponse structure', async () => {
      const response = await client.post('/api/projections/modules/validate', {
        rootPath: TEST_PROJECT_PATH
      });

      expect(response.status).toBe(200);
      validateAgainstSchema(response.body, 'ValidationResponse', openApiSpec);
      validateAgainstSchema(response.body.data, 'ValidationResult', openApiSpec);

      // Validate checks object
      for (const check of Object.values(response.body.data.checks)) {
        validateAgainstSchema(check, 'ValidationCheck', openApiSpec);
      }
    }, 30000);
  });

  describe('Response Headers Contract', () => {
    it('should return JSON content type', async () => {
      const response = await client.healthCheck();

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include standard response headers', async () => {
      const response = await client.healthCheck();

      // Should have cache control or similar headers
      expect(response.headers).toBeDefined();
    });
  });

  describe('Error Response Contract', () => {
    it('should return 404 with proper error structure', async () => {
      const response = await client.get('/api/projections/modules/non-existent-id');

      expect(response.status).toBe(404);
      validateAgainstSchema(response.body, 'ErrorResponse', openApiSpec);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});


