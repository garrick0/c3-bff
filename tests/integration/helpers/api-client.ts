/**
 * API Test Client
 * Helper for making API requests in tests
 */

import request from 'supertest';

export class ApiTestClient {
  constructor(private app: any) {}

  /**
   * POST request helper
   */
  async post(path: string, body: any) {
    return request(this.app)
      .post(path)
      .send(body)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
  }

  /**
   * GET request helper
   */
  async get(path: string, query?: Record<string, any>) {
    const req = request(this.app)
      .get(path)
      .set('Accept', 'application/json');

    if (query) {
      req.query(query);
    }

    return req;
  }

  /**
   * DELETE request helper
   */
  async delete(path: string) {
    return request(this.app)
      .delete(path)
      .set('Accept', 'application/json');
  }

  /**
   * Health check helper
   */
  async healthCheck() {
    return this.get('/health');
  }
}


