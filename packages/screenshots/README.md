# Page blocks - screenshots

This package will provide a way to generate and use screenshots of page blocks. Internally it uses 
[Playwright](https://playwright.dev/) to generate screenshots. You will need to install this first.

## Basic Usage
```js
import { join } from 'node:path';
import { cwd } from 'node:process';
import { createFileSystemLoader } from '@page-blocks/file-system';
import { createScreenshotGenerator } from '@page-blocks/screenshots';

export const generateScreenshots = createScreenshotGenerator({
  // URL to your dev server (or live site) - this will be used to load the blocks for screenshots
  host: 'http://localhost:3000',
  
  // == These are default options: ==
  // Where they should be saved.
  target: join(cwd(), 'public/blocks'),
  // The path to the page blocks "Block Archive"
  archivePath: './block-archive',
  // Viewport size to use for screenshots (height will only affect media queries)
  viewPort: { width: 1280, height: 800 },
});

export const fileSystemLoader = createFileSystemLoader({
  path: join(cwd(), 'slots'),
  contexts: [],
});

export const handler = createRequestHandler({
  loader: fileSystemLoader,
  directory,
  generateScreenshots, // Pass it to a request handler
});

// OR - generate screenshots manually
await generateScreenshots();
```

You will also need a page on your dev server or live site to list all the blocks.
The React implementation of the `createDirectory()` has a helper for this and to pass the `resolve.screenshots` option
to the directory configuration.

```js
// blocks/directory.js
import { createDirectory } from '@page-blocks/react';  
import { Card } from '../components/Card';
  
export const directory = createDirectory({  
  context: {},  
  resolver: {  
    type: 'tanstack-query',  
    endpoint: '/api/page-blocks',  
    screenshots: '/blocks', // Ensure you provide the public path to screenshots when creating your directory.
  },  
  blocks: {  
    Card,  
  },  
});

// An alternative to `directory.Slot` that just has the blocks
export const Blocks = directory.Blocks;

export const BlockArchive = directory.BlockArchive;
```


Which you can then use in your dev server or live site. For example, in Next.js (app directory):

```jsx
// app/block-archive/page.js
import { redirect } from 'next/navigation';
import { BlockArchive } from '~/blocks/directory';

export default function Page(): JSX.Element {
  // Only show this page in development
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }

  return (
    <div>
      <BlockArchive />
    </div>
  );
}
```
