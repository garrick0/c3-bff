/**
 * Projection routes
 */

import { Router } from 'express';
import { Container } from 'c3-wiring';
import { createSuccessResponse, createErrorResponse } from 'c3-shared';

export function createProjectionRoutes(container: Container): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const { graphId, projectionType, aggregationLevel } = req.body;

      // Stub: Would generate projection
      res.json(createSuccessResponse({
        projectionId: `proj-${Date.now()}`,
        type: projectionType,
        summary: {}
      }));
    } catch (error) {
      res.status(500).json(createErrorResponse(
        'PROJECTION_ERROR',
        (error as Error).message
      ));
    }
  });

  return router;
}
