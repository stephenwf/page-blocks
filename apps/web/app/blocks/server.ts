import { join } from 'node:path';
import { cwd } from 'node:process';
import { createFileSystemLoader } from '@page-blocks/file-system';
import { createScreenshotGenerator } from '@page-blocks/screenshots';

export const generateScreenshots = createScreenshotGenerator({
  host: 'http://localhost:3000',
  target: join(cwd(), 'public/blocks'),
});
export const fileSystemLoader = createFileSystemLoader({
  path: join(cwd(), 'slots'),
  contexts: [],
});
