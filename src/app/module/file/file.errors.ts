// ===== ERROR HANDLING UTILITIES =====

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  provider: string,
  operation: string,
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      throw new StorageError(
        `${operation} failed in ${provider}: ${error.message}`,
        provider,
        operation,
        error,
      );
    }
  };
};
