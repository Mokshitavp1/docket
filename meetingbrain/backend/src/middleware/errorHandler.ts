import { Request, Response, NextFunction } from 'express';
import { logger } from '../index';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Known operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
    });
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          error: `A record with this ${field} already exists.`,
          status: 'error',
        });
        return;

      case 'P2025':
        // Record not found
        res.status(404).json({
          error: 'The requested record was not found.',
          status: 'error',
        });
        return;

      case 'P2003':
        // Foreign key constraint
        res.status(400).json({
          error: 'Related record not found.',
          status: 'error',
        });
        return;

      case 'P2014':
        // Required relation violation
        res.status(400).json({
          error: 'Invalid relation in request.',
          status: 'error',
        });
        return;

      default:
        res.status(400).json({
          error: 'Database operation failed.',
          status: 'error',
        });
        return;
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'Invalid data provided.',
      status: 'error',
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token.',
      status: 'error',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token has expired. Please log in again.',
      status: 'error',
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      error: 'File upload error: ' + err.message,
      status: 'error',
    });
    return;
  }

  // SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON in request body.',
      status: 'error',
    });
    return;
  }

  // Default: unknown server error
  res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
    status: 'error',
  });
};

// Async error wrapper — wraps route handlers so you don't need try/catch everywhere
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};