import { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRequestHandler, ServerOptions } from '@page-blocks/node';

export function createNextRequestHandler(options: ServerOptions<any>) {
  const handler = createRequestHandler(options);

  return async (req: NextRequest) => {
    const { status, body } = await handler(await req.json());
    return NextResponse.json(body, { status });
  };
}

export function createNextPageRequestHandler(options: ServerOptions<any>) {
  const handler = createRequestHandler(options);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { status, body } = await handler(req.body);
    return res.status(status).json(body);
  };
}
