/**
 * Projection routes
 */

import { Router } from 'express';
import { Container } from '@garrick0/c3-wiring';
import {
  analyzeModules,
  getModuleView,
  exportModuleView,
  validateArchitecture,
  listAnalyses,
  deleteAnalysis
} from '../controllers/projection.controller.js';

export function createProjectionRoutes(container: Container): Router {
  const router = Router();

  // Module analysis endpoints
  router.post('/modules/analyze', analyzeModules(container));
  router.get('/modules/:analysisId', getModuleView(container));
  router.get('/modules/:analysisId/export', exportModuleView(container));
  router.post('/modules/validate', validateArchitecture(container));
  router.get('/modules', listAnalyses(container));
  router.delete('/modules/:analysisId', deleteAnalysis(container));

  return router;
}
