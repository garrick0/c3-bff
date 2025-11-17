/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@garrick0/c3-shared';

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  res.status(500).json(createErrorResponse(
    'INTERNAL_ERROR',
    error.message,
    { stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
  ));
}
