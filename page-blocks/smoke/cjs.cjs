const root = require('page-blocks');
const nodeHelpers = require('page-blocks/node');
const server = require('page-blocks/server');
const fileSystem = require('page-blocks/file-system');
const reactHelpers = require('page-blocks/react');
const vitePlugin = require('page-blocks/vite');
const viteServer = require('page-blocks/vite/server');

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
