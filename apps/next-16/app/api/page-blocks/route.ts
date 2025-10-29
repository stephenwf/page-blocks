import { createNextRequestHandler } from '@page-blocks/next';
import { fileSystemLoader, generateScreenshots } from '../../blocks/server';
import { directory } from '../../blocks/directory';

export const POST = createNextRequestHandler({
  loader: fileSystemLoader,
  directory,
  generateScreenshots,
});
