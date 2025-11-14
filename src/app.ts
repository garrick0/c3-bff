/**
 * Express app configuration
 */

import express, { Express } from 'express';
import cors from 'cors';
import { Container } from 'c3-wiring';
import { errorMiddleware } from './middleware/error.middleware.js';
import { loggingMiddleware } from './middleware/logging.middleware.js';
import { createRoutes } from './routes/index.js';

export function createApp(container: Container): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(loggingMiddleware);

  // Routes
  app.use('/api', createRoutes(container));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling
  app.use(errorMiddleware);

  return app;
}
