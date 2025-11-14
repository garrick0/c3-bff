/**
 * Route registration
 */

import { Router } from 'express';
import { Container } from 'c3-wiring';
import { createParsingRoutes } from './parsing.routes.js';
import { createComplianceRoutes } from './compliance.routes.js';
import { createDiscoveryRoutes } from './discovery.routes.js';
import { createProjectionRoutes } from './projection.routes.js';

export function createRoutes(container: Container): Router {
  const router = Router();

  router.use('/parse', createParsingRoutes(container));
  router.use('/compliance', createComplianceRoutes(container));
  router.use('/discovery', createDiscoveryRoutes(container));
  router.use('/projections', createProjectionRoutes(container));

  return router;
}
