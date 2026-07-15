import {
  getPageBlocksServiceOperationClass,
  pageBlocksServiceRequestSchema,
  parsePageBlocksServiceResponse,
  PageBlocksServiceOperationClass,
  PageBlocksServiceRequest,
} from '../core';
import { PageBlocksForbiddenError, PageBlocksServiceError } from './errors';
import { PageBlocksService } from './service';

type AuthorizationContext = {
  request: Request;
  operation: PageBlocksServiceOperationClass;
  command: PageBlocksServiceRequest['type'];
  scope: string;
};

export interface PageBlocksHandlerOptions {
  service: PageBlocksService;
  scope?: string | ((request: Request) => string | Promise<string>);
  authorize?: (context: AuthorizationContext) => boolean | Promise<boolean>;
  maximumBodySize?: number;
  onError?: (error: unknown, request: Request) => void;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(error: PageBlocksServiceError) {
  return json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(typeof error.details === 'undefined' ? {} : { details: error.details }),
      },
    },
    error.status
  );
}

async function readBoundedJson(request: Request, maximumBodySize: number) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodySize) {
    throw new PageBlocksServiceError(
      'body_too_large',
      `Page Blocks request bodies may not exceed ${maximumBodySize} bytes.`,
      413
    );
  }

  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximumBodySize) {
      await reader.cancel();
      throw new PageBlocksServiceError(
        'body_too_large',
        `Page Blocks request bodies may not exceed ${maximumBodySize} bytes.`,
        413
      );
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PageBlocksServiceError('invalid_request', 'The request body is not valid JSON.', 400);
  }
}

export function createPageBlocksHandler(options: PageBlocksHandlerOptions) {
  const maximumBodySize = options.maximumBodySize || 1024 * 1024;

  return async (request: Request): Promise<Response> => {
    try {
      if (request.method !== 'POST') {
        return json({ error: { code: 'invalid_request', message: 'Page Blocks only accepts POST requests.' } }, 405);
      }

      const contentType = request.headers.get('content-type');
      if (contentType && !contentType.toLowerCase().includes('application/json')) {
        throw new PageBlocksServiceError('invalid_request', 'The request content type must be application/json.', 400);
      }

      const input = await readBoundedJson(request, maximumBodySize);
      const parsed = pageBlocksServiceRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new PageBlocksServiceError(
          'invalid_request',
          'The Page Blocks request is invalid.',
          400,
          parsed.error.issues
        );
      }

      const command = parsed.data;
      const scope =
        typeof options.scope === 'function' ? await options.scope(request) : options.scope || 'default';
      const operation = getPageBlocksServiceOperationClass(command.type);
      const authorized = options.authorize
        ? await options.authorize({ request, operation, command: command.type, scope })
        : operation === 'read';
      if (!authorized) throw new PageBlocksForbiddenError();

      const response = await options.service.dispatch(scope, command);
      return json(parsePageBlocksServiceResponse(command.type, response));
    } catch (error) {
      if (error instanceof PageBlocksServiceError) return errorResponse(error);
      options.onError?.(error, request);
      return errorResponse(
        new PageBlocksServiceError('internal_error', 'The Page Blocks request could not be completed.', 500)
      );
    }
  };
}
