/**
 * Parsing routes
 */

import { Router } from 'express';
import { Container } from 'c3-wiring';
import { TOKENS } from 'c3-wiring';
import { createSuccessResponse, createErrorResponse } from 'c3-shared';

export function createParsingRoutes(container: Container): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const { rootPath } = req.body;

      const parsingService = container.get(TOKENS.PARSING_SERVICE) as any;
      const graph = await parsingService.parseCodebase(rootPath);

      res.json(createSuccessResponse({
        graphId: graph.id,
        nodeCount: graph.getNodeCount(),
        edgeCount: graph.getEdgeCount()
      }));
    } catch (error) {
      res.status(500).json(createErrorResponse(
        'PARSE_ERROR',
        (error as Error).message
      ));
    }
  });

  router.get('/:graphId', async (req, res) => {
    try {
      const { graphId } = req.params;

      const parsingService = container.get(TOKENS.PARSING_SERVICE) as any;
      const graph = await parsingService.getCachedGraph(graphId);

      if (!graph) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Graph not found'));
        return;
      }

      res.json(createSuccessResponse({
        graphId: graph.id,
        nodeCount: graph.getNodeCount(),
        edgeCount: graph.getEdgeCount(),
        metadata: graph.metadata
      }));
    } catch (error) {
      res.status(500).json(createErrorResponse(
        'INTERNAL_ERROR',
        (error as Error).message
      ));
    }
  });

  return router;
}
