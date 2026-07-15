export class PageBlocksClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'PageBlocksClientError';
    this.status = options.status || 0;
    this.code = options.code || 'request_failed';
    this.details = options.details;
  }
}

export async function readPageBlocksResponse(response: Response) {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new PageBlocksClientError('The Page Blocks server returned a non-JSON response.', {
      status: response.status,
      code: 'invalid_response',
      details: error,
    });
  }

  if (!response.ok) {
    const envelope = body && typeof body === 'object' ? (body as Record<string, unknown>).error : undefined;
    const error = envelope && typeof envelope === 'object' ? (envelope as Record<string, unknown>) : undefined;
    const message =
      (error && typeof error.message === 'string' && error.message) ||
      (typeof envelope === 'string' && envelope) ||
      `Page Blocks request failed with status ${response.status}.`;
    throw new PageBlocksClientError(message, {
      status: response.status,
      code: error && typeof error.code === 'string' ? error.code : 'request_failed',
      details: body,
    });
  }

  return body;
}
