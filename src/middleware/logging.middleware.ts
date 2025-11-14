/**
 * Request logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from 'c3-shared';

const logger = createLogger('BFF:HTTP');

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });
  });

  next();
}
