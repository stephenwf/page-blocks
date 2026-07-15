import * as root from 'page-blocks';
import * as nodeHelpers from 'page-blocks/node';
import * as server from 'page-blocks/server';
import * as fileSystem from 'page-blocks/file-system';
import * as reactHelpers from 'page-blocks/react';
import * as vitePlugin from 'page-blocks/vite';
import * as viteServer from 'page-blocks/vite/server';

for (const [name, value] of Object.entries({
  root,
  nodeHelpers,
  server,
  fileSystem,
  reactHelpers,
  vitePlugin,
  viteServer,
})) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new Error(`Expected ${name} to resolve to a module export`);
  }
}
