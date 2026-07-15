import {
  pageBlocksServiceRequestSchema,
  parsePageBlocksServiceResponse,
  PageBlocksServiceRequest,
  PageBlocksServiceResponseMap,
} from '../core';
import { PageBlocksClientError, readPageBlocksResponse } from './errors';

export interface PageBlocksRemoteClientOptions {
  endpoint: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
}

export function createPageBlocksRemoteClient(options: PageBlocksRemoteClientOptions) {
  const request = async <Type extends PageBlocksServiceRequest['type']>(
    command: Extract<PageBlocksServiceRequest, { type: Type }>
  ): Promise<PageBlocksServiceResponseMap[Type]> => {
    const parsed = pageBlocksServiceRequestSchema.parse(command);
    const configuredHeaders = typeof options.headers === 'function' ? await options.headers() : options.headers;
    const headers = new Headers(configuredHeaders);
    headers.set('content-type', 'application/json');
    headers.set('accept', 'application/json');

    const response = await (options.fetch || globalThis.fetch)(options.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(parsed),
    });
    const body = await readPageBlocksResponse(response);
    try {
      return parsePageBlocksServiceResponse(parsed.type, body) as PageBlocksServiceResponseMap[Type];
    } catch (error) {
      throw new PageBlocksClientError('The Page Blocks server returned an invalid response.', {
        status: response.status,
        code: 'invalid_response',
        details: error,
      });
    }
  };

  return {
    request,
    query: (context: Record<string, string>, slots?: string[]) => request({ type: 'query', context, slots }),
    get: (target: Extract<PageBlocksServiceRequest, { type: 'get' }>['target']) =>
      request({ type: 'get', target }),
    create: (
      locator: Extract<PageBlocksServiceRequest, { type: 'create' }>['locator'],
      document?: Extract<PageBlocksServiceRequest, { type: 'create' }>['document']
    ) => request({ type: 'create', locator, document }),
    mutate: (
      target: Extract<PageBlocksServiceRequest, { type: 'mutate' }>['target'],
      expectedVersion: number,
      mutation: Extract<PageBlocksServiceRequest, { type: 'mutate' }>['mutation']
    ) => request({ type: 'mutate', target, expectedVersion, mutation }),
    delete: (
      target: Extract<PageBlocksServiceRequest, { type: 'delete' }>['target'],
      expectedVersion: number
    ) => request({ type: 'delete', target, expectedVersion }),
    contextValues: (context: string) => request({ type: 'context-values', context }),
    subContexts: (context: Record<string, string>) => request({ type: 'sub-contexts', context }),
    subContextBlocks: (
      context: Record<string, string>,
      query?: Extract<PageBlocksServiceRequest, { type: 'sub-context-blocks' }>['options']
    ) => request({ type: 'sub-context-blocks', context, options: query }),
  };
}

export type PageBlocksRemoteClient = ReturnType<typeof createPageBlocksRemoteClient>;
