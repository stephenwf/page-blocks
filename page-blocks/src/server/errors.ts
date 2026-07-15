export type PageBlocksErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'body_too_large'
  | 'internal_error';

export class PageBlocksServiceError extends Error {
  readonly code: PageBlocksErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: PageBlocksErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'PageBlocksServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class PageBlocksNotFoundError extends PageBlocksServiceError {
  constructor(message: string) {
    super('not_found', message, 404);
  }
}

export class PageBlocksConflictError extends PageBlocksServiceError {
  constructor(message: string) {
    super('conflict', message, 409);
  }
}

export class PageBlocksUnauthorizedError extends PageBlocksServiceError {
  constructor(message = 'Authentication is required.') {
    super('unauthorized', message, 401);
  }
}

export class PageBlocksForbiddenError extends PageBlocksServiceError {
  constructor(message = 'This Page Blocks operation is not permitted.') {
    super('forbidden', message, 403);
  }
}
