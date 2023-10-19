import { NextRequest, NextResponse } from 'next/server';
import { createRequestHandler, ServerOptions } from '@page-blocks/node';

export function createNextRequestHandler(options: ServerOptions<any>) {
  const handler = createRequestHandler(options);

  return async (req: NextRequest) => {
    const { status, body } = await handler(await req.json());
    return NextResponse.json(body, { status });
  };
}
