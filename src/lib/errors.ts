import { logger } from './logger';

// Custom error types for better error handling
export class DatabaseError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error handling utilities
export function logError(error: Error, context: string): void {
  logger.error(`[${context}] ${error.name}: ${error.message}`, error);
}

export function handleDatabaseError(error: unknown, operation: string): never {
  const message = `Failed to ${operation}`;
  logError(error instanceof Error ? error : new Error(String(error)), operation);
  throw new DatabaseError(message, error instanceof Error ? error : undefined);
}
