/**
 * Error Handling Utilities
 *
 * Provides consistent error handling and logging across the application
 */

import { NextResponse } from 'next/server';
import type { ApiError } from '@/types/api';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public details: string[];

  constructor(message: string, details: string[] = []) {
    super(message, 400);
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Error response formatter
 */
export function formatError(error: unknown, context: string = ''): ApiError {
  if (error instanceof AppError) {
    const apiError: ApiError = {
      error: error.message
    };

    if (error instanceof ValidationError && error.details.length > 0) {
      apiError.details = error.details;
    }

    return apiError;
  }

  if (error instanceof Error) {
    // Log operational errors but don't expose internals
    console.error(`${context}: ${error.message}`, {
      stack: error.stack,
      name: error.name
    });

    return {
      error: error.message.includes('JWT') || error.message.includes('auth')
        ? 'Authentication failed'
        : 'An unexpected error occurred'
    };
  }

  // Unknown error type
  console.error(`${context}: Unknown error`, { error });
  return {
    error: 'An unexpected error occurred'
  };
}

/**
 * API error response helper
 */
export function apiErrorResponse(error: unknown, context: string = '', statusCode: number = 500) {
  const formattedError = formatError(error, context);

  // Determine status code from error type
  let finalStatusCode = statusCode;
  if (error instanceof AppError) {
    finalStatusCode = error.statusCode;
  }

  return NextResponse.json(formattedError, { status: finalStatusCode });
}

/**
 * Async route handler wrapper with consistent error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const context = `Route handler ${handler.name || 'anonymous'}`;
      return apiErrorResponse(error, context);
    }
  };
}

/**
 * Database operation wrapper with error handling
 */
export async function withDbError<T>(
  operation: () => Promise<T>,
  context: string = 'Database operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${context} failed:`, error);

    // Re-throw as AppError for consistent handling
    if (error instanceof Error) {
      throw new AppError(`Database operation failed: ${error.message}`, 500);
    }

    throw new AppError('Database operation failed', 500);
  }
}
