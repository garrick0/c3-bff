/**
 * Discovery routes
 */

import { Router } from 'express';
import { Container } from 'c3-wiring';
import { TOKENS } from 'c3-wiring';
import { createSuccessResponse, createErrorResponse } from 'c3-shared';

export function createDiscoveryRoutes(container: Container): Router {
  const router = Router();

  router.post('/patterns', async (req, res) => {
    try {
      const { graphId } = req.body;

      const parsingService = container.get(TOKENS.PARSING_SERVICE) as any;
      const graph = await parsingService.getCachedGraph(graphId);

      if (!graph) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Graph not found'));
        return;
      }

      const patternDetection = container.get(TOKENS.PATTERN_DETECTION_SERVICE) as any;
      const patterns = await patternDetection.detectPatterns(graph);

      res.json(createSuccessResponse({
        patterns: patterns.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          frequency: p.frequency,
          confidence: p.getConfidence()
        }))
      }));
    } catch (error) {
      res.status(500).json(createErrorResponse(
        'DISCOVERY_ERROR',
        (error as Error).message
      ));
    }
  });

  router.post('/infer-rules', async (req, res) => {
    try {
      const { patternIds } = req.body;

      // Stub: Would fetch patterns and infer rules
      res.json(createSuccessResponse({
        candidateRules: []
      }));
    } catch (error) {
      res.status(500).json(createErrorResponse(
        'INFERENCE_ERROR',
        (error as Error).message
      ));
    }
  });

  return router;
}
