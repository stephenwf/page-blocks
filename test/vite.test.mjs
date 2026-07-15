import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import { build } from 'vite';

import { createRemoteLoader, createSlotEditingClient, getPageBlocksRuntime } from 'page-blocks/client';
import { compileBlueprintModules, designer, syncBlueprintFiles } from 'page-blocks/designer';
import { createFileSystemLoader } from 'page-blocks/file-system';
import { queryStaticManifest } from 'page-blocks/core';
import { block, createDirectory, CustomSlot } from 'page-blocks/react';
import { RenderClientSlot } from 'page-blocks/react-client';
import pageBlocks from 'page-blocks/vite';
import { loadPageBlocksSlots, resolvePageBlocksContext } from 'page-blocks/vite/server';

const originalGlobals = {
  config: globalThis.__PAGE_BLOCKS_VITE_CONFIG__,
  manifest: globalThis.__PAGE_BLOCKS_VITE_STATIC_MANIFEST__,
  staticFilesManifest: globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__,
  staticMode: globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__,
  fetch: globalThis.fetch,
  location: globalThis.location,
};

afterEach(() => {
  restoreGlobal('__PAGE_BLOCKS_VITE_CONFIG__', originalGlobals.config);
  restoreGlobal('__PAGE_BLOCKS_VITE_STATIC_MANIFEST__', originalGlobals.manifest);
  restoreGlobal('__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__', originalGlobals.staticFilesManifest);
  restoreGlobal('__PAGE_BLOCKS_VITE_STATIC_MODE__', originalGlobals.staticMode);
  restoreGlobal('fetch', originalGlobals.fetch);
  restoreGlobal('location', originalGlobals.location);
});

function restoreGlobal(key, value) {
  if (typeof value === 'undefined') {
    delete globalThis[key];
    return;
  }

  globalThis[key] = value;
}

async function createTempSlots(structure) {
  const dir = await mkdtemp(join(tmpdir(), 'page-blocks-vite-'));

  await Promise.all(
    Object.entries(structure).map(async ([file, data]) => {
      const filePath = join(dir, file);
      const parts = file.split('/').slice(0, -1);

      if (parts.length > 0) {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(join(dir, ...parts), { recursive: true });
      }

      await writeFile(filePath, JSON.stringify(data, null, 2));
    })
  );

  return dir;
}

async function readFilesRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readFilesRecursive(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const TestCard = block(
  {
    label: 'Test card',
    props: z.object({
      title: z.string(),
      variant: z.string().optional(),
    }),
    form: { type: 'object', required: ['title'], properties: { title: { type: 'string' } } },
    mapFromProps: (props) => ({
      headline: props.title,
      variant: props.variant || 'default',
    }),
  },
  function TestCard() {
    return null;
  }
);

const testDirectory = createDirectory({
  version: '2026-07',
  contexts: { required: ['path'] },
  slots: { hero: { allowedBlocks: ['TestCard'], maxItems: 3 } },
  blocks: {
    TestCard,
  },
});

const { design } = designer(testDirectory);

test('React directories expose a serializable policy manifest and one server/client renderer', () => {
  const serialized = JSON.parse(JSON.stringify(testDirectory.manifest));
  assert.equal(serialized.version, '2026-07');
  assert.deepEqual(serialized.contexts.required, ['path']);
  assert.deepEqual(serialized.slots[0], {
    name: 'hero', policy: { allowedBlocks: ['TestCard'], maxItems: 3 },
  });
  assert.equal(serialized.blocks[0].form.type, 'object');

  const Card = ({ title, context }) => React.createElement('h2', null, `${title}:${context.path}`);
  const renderProps = {
    name: 'hero', context: { path: '/about' },
    options: { blocks: { Card } },
    metadata: { Card: { label: 'Card' } },
    slot: {
      id: 'hero-id', slot: 'hero',
      blocks: [{ id: 'card-id', type: 'Card', data: { title: 'Hello' } }],
    },
  };
  assert.equal(
    renderToStaticMarkup(React.createElement(CustomSlot, renderProps)),
    renderToStaticMarkup(React.createElement(RenderClientSlot, renderProps))
  );
});

test('slot editing client merges default path context before explicit context', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'local',
    readOnly: false,
    apiPath: '/custom-page-blocks',
    contexts: ['path'],
    defaultContexts: ['path'],
  };
  globalThis.location = { pathname: '/products/' };

  let request;
  globalThis.fetch = async (url, init) => {
    request = {
      url,
      body: JSON.parse(init.body),
    };

    return {
      ok: true,
      status: 200,
      async json() {
        return { slots: {}, isEmpty: true, slotNames: [], context: request.body.context };
      },
    };
  };

  const client = createSlotEditingClient({
    context: { locale: 'en' },
  });

  await client.getSlotList({ theme: 'dark' }, ['hero']);

  assert.equal(request.url, '/custom-page-blocks');
  assert.deepEqual(request.body.context, {
    path: '/products',
    locale: 'en',
    theme: 'dark',
  });
});

test('static remote loader resolves manifest data without fetch', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'static',
    readOnly: true,
    contexts: ['path'],
    defaultContexts: ['path'],
  };
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__ = true;
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MANIFEST__ = {
    contexts: ['path'],
    entries: [
      {
        id: 'global-hero',
        slot: 'hero',
        specificity: 0,
        contexts: [],
      },
      {
        id: 'about-hero',
        slot: 'hero',
        specificity: 1,
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
    ],
    slots: {
      'global-hero': {
        id: 'global-hero',
        slot: 'hero',
        blocks: [{ id: 'global-card', type: 'CalloutCard', data: { title: 'Global hero' } }],
      },
      'about-hero': {
        id: 'about-hero',
        slot: 'hero',
        blocks: [{ id: 'about-card', type: 'CalloutCard', data: { title: 'About hero' } }],
      },
    },
  };

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('Static builds should not fetch page-blocks data.');
  };

  const loader = createRemoteLoader({});
  const initialData = loader.getInitialData({ path: '/about' }, ['hero']);
  const [, query] = loader({ path: '/about' }, ['hero']);
  const resolved = await query();

  assert.equal(fetchCalls, 0);
  assert.deepEqual(initialData, resolved);
  assert.equal(resolved.slots.hero.blocks[0].id, 'about-card');
});

test('preview runtime starts baked, switches query generations to remote, and can revoke the session', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'preview',
    staticOutput: 'inline',
    readOnly: false,
    contexts: ['path'],
    defaultContexts: ['path'],
  };
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MANIFEST__ = {
    contexts: ['path'],
    entries: [{ id: 'baked', slot: 'hero', specificity: 0, contexts: [] }],
    slots: {
      baked: { id: 'baked', slot: 'hero', blocks: [{ id: 'baked-card', type: 'card', data: {} }] },
    },
  };

  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('anonymous preview must not fetch'); };
  const runtime = getPageBlocksRuntime();
  const bakedLoader = createRemoteLoader({});
  const [bakedKey, loadBaked] = bakedLoader({}, ['hero']);
  assert.equal((await loadBaked()).slots.hero.blocks[0].id, 'baked-card');
  assert.equal(fetchCalls, 0);
  assert.equal(runtime.getSnapshot().capabilities.edit, false);

  runtime.useRemote({
    capabilities: { read: true, edit: true },
    client: {
      async query(context) {
        return {
          slots: { hero: { id: 'remote', slot: 'hero', blocks: [{ id: 'remote-card', type: 'card', data: {} }] } },
          isEmpty: false, slotNames: ['hero'], context,
        };
      },
    },
  });
  const [remoteKey, loadRemote] = createRemoteLoader({})({}, ['hero']);
  assert.notDeepEqual(remoteKey, bakedKey);
  assert.equal((await loadRemote()).slots.hero.blocks[0].id, 'remote-card');
  assert.equal(runtime.getSnapshot().capabilities.edit, true);

  runtime.useStatic();
  const [restoredKey, loadRestored] = createRemoteLoader({})({}, ['hero']);
  assert.notDeepEqual(restoredKey, remoteKey);
  assert.equal((await loadRestored()).slots.hero.blocks[0].id, 'baked-card');
});

test('static-files remote loader fetches matched slot JSON and caches it by file path', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'static',
    staticOutput: 'lazy-files',
    readOnly: true,
    contexts: ['path'],
    basePath: '/preview/',
    defaultContexts: ['path'],
  };
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__ = true;
  globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__ = {
    contexts: ['path'],
    entries: [
      {
        id: 'about-hero',
        slot: 'hero',
        specificity: 1,
        file: 'page-blocks/slots/test-cache/@path/about/hero.json',
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
    ],
  };
  globalThis.location = {
    pathname: '/preview/about/',
    href: 'https://example.com/preview/about/',
  };

  const fetchCalls = [];
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });

    return {
      ok: true,
      async json() {
        return {
          blocks: [{ id: 'about-card', type: 'CalloutCard', data: { title: 'About hero' } }],
        };
      },
    };
  };

  const loader = createRemoteLoader({});

  assert.equal(loader.getInitialData?.({ path: '/about' }, ['hero']), undefined);

  const first = await loader({ path: '/about' }, ['hero'])[1]();
  const cached = loader.getInitialData?.({ path: '/about' }, ['hero']);
  const second = await loader({ path: '/about' }, ['hero'])[1]();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'https://example.com/preview/page-blocks/slots/test-cache/@path/about/hero.json');
  assert.equal(fetchCalls[0].init, undefined);
  assert.equal(first.slots.hero.blocks[0].id, 'about-card');
  assert.equal(cached?.slots.hero.blocks[0].id, 'about-card');
  assert.equal(second.slots.hero.blocks[0].id, 'about-card');
});

test('static-files remote loader treats empty slotIds as all matching slots', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'static',
    staticOutput: 'lazy-files',
    readOnly: true,
    contexts: ['path'],
    basePath: '/',
    defaultContexts: ['path'],
  };
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__ = true;
  globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__ = {
    contexts: ['path'],
    entries: [
      {
        id: 'about-hero',
        slot: 'hero',
        specificity: 1,
        file: 'page-blocks/slots/test-all/@path/about/hero.json',
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
      {
        id: 'about-footer',
        slot: 'footer',
        specificity: 1,
        file: 'page-blocks/slots/test-all/@path/about/footer.json',
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
    ],
  };
  globalThis.location = {
    pathname: '/about/',
    href: 'https://example.com/about/',
  };

  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    fetchCalls.push(url);

    if (String(url).endsWith('/hero.json')) {
      return {
        ok: true,
        async json() {
          return {
            blocks: [{ id: 'about-hero', type: 'CalloutCard', data: { title: 'About hero' } }],
          };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return {
          blocks: [{ id: 'about-footer', type: 'CalloutCard', data: { title: 'About footer' } }],
        };
      },
    };
  };

  const loader = createRemoteLoader({});
  const unfiltered = await loader({ path: '/about' }, [])[1]();
  const filtered = await loader({ path: '/about' }, ['hero'])[1]();

  assert.deepEqual(unfiltered.slotNames.sort(), ['footer', 'hero']);
  assert.equal(unfiltered.slots.hero.blocks[0].id, 'about-hero');
  assert.equal(unfiltered.slots.footer.blocks[0].id, 'about-footer');
  assert.deepEqual(filtered.slotNames, ['hero']);
  assert.equal(fetchCalls.length, 2);
});

test('static-files remote loader fetches fresh slot files when the route context changes', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'static',
    staticOutput: 'lazy-files',
    readOnly: true,
    contexts: ['path'],
    basePath: '/',
    defaultContexts: ['path'],
  };
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__ = true;
  globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__ = {
    contexts: ['path'],
    entries: [
      {
        id: 'about-hero',
        slot: 'hero',
        specificity: 1,
        file: 'page-blocks/slots/test-routes/@path/about/hero.json',
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
      {
        id: 'contact-hero',
        slot: 'hero',
        specificity: 1,
        file: 'page-blocks/slots/test-routes/@path/contact/hero.json',
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/contact' },
          },
        ],
      },
    ],
  };
  globalThis.location = {
    pathname: '/about/',
    href: 'https://example.com/about/',
  };

  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    fetchCalls.push(url);

    return {
      ok: true,
      async json() {
        if (String(url).endsWith('/contact/hero.json')) {
          return {
            blocks: [{ id: 'contact-card', type: 'CalloutCard', data: { title: 'Contact hero' } }],
          };
        }

        return {
          blocks: [{ id: 'about-card', type: 'CalloutCard', data: { title: 'About hero' } }],
        };
      },
    };
  };

  const loader = createRemoteLoader({});
  const about = await loader({ path: '/about' }, ['hero'])[1]();
  const contact = await loader({ path: '/contact' }, ['hero'])[1]();

  assert.equal(about.slots.hero.blocks[0].id, 'about-card');
  assert.equal(contact.slots.hero.blocks[0].id, 'contact-card');
  assert.equal(fetchCalls.length, 2);
  assert.equal(String(fetchCalls[0]).endsWith('/about/hero.json'), true);
  assert.equal(String(fetchCalls[1]).endsWith('/contact/hero.json'), true);
});

test('queryStaticManifest treats empty slotIds as all matching slots', () => {
  const manifest = {
    contexts: ['path'],
    entries: [
      {
        id: 'about-hero',
        slot: 'hero',
        specificity: 1,
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
      {
        id: 'about-footer',
        slot: 'footer',
        specificity: 1,
        contexts: [
          {
            id: 'path',
            specificity: 1,
            match: { type: 'exact', value: '/about' },
          },
        ],
      },
    ],
    slots: {
      'about-hero': {
        id: 'about-hero',
        slot: 'hero',
        blocks: [{ id: 'about-card', type: 'CalloutCard', data: { title: 'About hero' } }],
      },
      'about-footer': {
        id: 'about-footer',
        slot: 'footer',
        blocks: [{ id: 'about-footer-card', type: 'CalloutCard', data: { title: 'About footer' } }],
      },
    },
  };

  const unfiltered = queryStaticManifest(manifest, { path: '/about' }, []);
  const filtered = queryStaticManifest(manifest, { path: '/about' }, ['hero']);

  assert.deepEqual(unfiltered.slotNames.sort(), ['footer', 'hero']);
  assert.equal(unfiltered.slots.hero.blocks[0].id, 'about-card');
  assert.equal(unfiltered.slots.footer.blocks[0].id, 'about-footer-card');
  assert.deepEqual(filtered.slotNames, ['hero']);
  assert.deepEqual(Object.keys(filtered.slots), ['hero']);
});

test('file system loader creates a missing slots directory on init', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'page-blocks-vite-loader-'));
  const slotsDir = join(root, 'slots');

  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const loader = createFileSystemLoader({
    path: slotsDir,
    contexts: ['path'],
  });

  await loader.init();

  assert.equal(existsSync(slotsDir), true);
  const response = await loader.query({ path: '/' }, ['hero']);
  assert.equal(response.isEmpty, true);
});

test('file system loader treats empty slotIds as all matching slots', async (t) => {
  const slotsDir = await createTempSlots({
    '@path/about/hero.json': {
      name: 'hero',
      blocks: [{ id: 'about-hero', type: 'CalloutCard', data: { title: 'About hero' } }],
    },
    '@path/about/footer.json': {
      name: 'footer',
      blocks: [{ id: 'about-footer', type: 'CalloutCard', data: { title: 'About footer' } }],
    },
  });

  t.after(async () => {
    await rm(slotsDir, { recursive: true, force: true });
  });

  const loader = createFileSystemLoader({
    path: slotsDir,
    contexts: ['path'],
  });

  await loader.init();

  const unfiltered = await loader.query({ path: '/about' }, []);
  const filtered = await loader.query({ path: '/about' }, ['hero']);

  assert.deepEqual(unfiltered.slotNames.sort(), ['footer', 'hero']);
  assert.equal(unfiltered.slots.hero.blocks[0].id, 'about-hero');
  assert.equal(unfiltered.slots.footer.blocks[0].id, 'about-footer');
  assert.deepEqual(filtered.slotNames, ['hero']);
  assert.deepEqual(Object.keys(filtered.slots), ['hero']);
});

test('file system loader exposes slot source metadata without persisting it', async (t) => {
  const slotsDir = await createTempSlots({
    '@path/offers/@country/japan/hero.json': {
      name: 'hero',
      blocks: [{ id: 'japan-hero', type: 'CalloutCard', data: { title: 'Japan hero' } }],
    },
  });

  t.after(async () => {
    await rm(slotsDir, { recursive: true, force: true });
  });

  const loader = createFileSystemLoader({
    path: slotsDir,
    contexts: ['path', 'country'],
  });

  await loader.init();

  const response = await loader.query({ path: '/offers', country: 'japan' }, ['hero']);
  const heroSlot = response.slots.hero;

  assert.deepEqual(heroSlot.source, {
    filePath: '@path/offers/@country/japan/hero.json',
    matchedContexts: [
      { id: 'path', type: 'exact', value: '/offers' },
      { id: 'country', type: 'exact', value: 'japan' },
    ],
  });

  const found = await loader.find(heroSlot.id);
  assert.deepEqual(found.source, heroSlot.source);

  await loader.update(heroSlot.id, found);

  const rawJson = JSON.parse(await readFile(join(slotsDir, '@path/offers/@country/japan/hero.json'), 'utf8'));
  assert.equal(rawJson.source, undefined);

  const created = await loader.createSlot({
    slot: 'promo',
    matches: [
      { id: 'country', type: 'exact', value: 'japan' },
      { id: 'path', type: 'exact', value: '/offers' },
    ],
  });

  assert.deepEqual(created.source, {
    filePath: '@path/offers/@country/japan/promo.json',
    matchedContexts: [
      { id: 'path', type: 'exact', value: '/offers' },
      { id: 'country', type: 'exact', value: 'japan' },
    ],
  });
});

test('file system loader reuses parent file metadata for inner slots', async (t) => {
  const slotsDir = await createTempSlots({
    'hero.json': {
      name: 'hero',
      blocks: [
        {
          id: 'hero-card',
          type: 'TestCard',
          data: { title: 'Hero card' },
          slots: {
            details: {
              blocks: [{ id: 'detail-card', type: 'TestCard', data: { title: 'Detail card' } }],
            },
          },
        },
      ],
    },
  });

  t.after(async () => {
    await rm(slotsDir, { recursive: true, force: true });
  });

  const loader = createFileSystemLoader({
    path: slotsDir,
    contexts: [],
  });

  await loader.init();

  const response = await loader.query({}, ['hero']);
  const heroSlot = response.slots.hero;
  const innerSlot = await loader.findInnerSlot('details', {
    slotId: heroSlot.id,
    blockId: 'hero-card',
  });

  assert.equal(innerSlot.blocks[0].id, 'detail-card');
  assert.deepEqual(innerSlot.source, {
    filePath: 'hero.json',
    matchedContexts: [],
    embeddedIn: {
      slotId: heroSlot.id,
      blockId: 'hero-card',
    },
  });
});

test('read-only builds reject slot mutations', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'static',
    readOnly: true,
    contexts: ['path'],
    defaultContexts: ['path'],
  };
  globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__ = true;

  const client = createSlotEditingClient({});

  await assert.rejects(
    () => client.updateSlot('hero', { name: 'hero', blocks: [] }),
    /read-only builds/
  );
});

test('vite server helpers resolve slots from request paths', async (t) => {
  const slotsDir = await createTempSlots({
    'hero.json': {
      name: 'hero',
      blocks: [{ id: 'global-hero', type: 'CalloutCard', data: { title: 'Global hero' } }],
    },
    '@path/about/hero.json': {
      name: 'hero',
      blocks: [{ id: 'about-hero', type: 'CalloutCard', data: { title: 'About hero' } }],
    },
  });

  t.after(async () => {
    await rm(slotsDir, { recursive: true, force: true });
  });

  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'local',
    readOnly: false,
    slotsDir,
    contexts: ['path'],
    defaultContexts: ['path'],
  };

  const context = resolvePageBlocksContext('https://example.com/about/');
  const response = await loadPageBlocksSlots(context, ['hero']);

  assert.deepEqual(context, { path: '/about' });
  assert.equal(response.slotNames[0], 'hero');
  assert.equal(response.slots.hero.blocks[0].id, 'about-hero');
});

test('vite plugin emits a lightweight lazy-files manifest and matching JSON assets', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'page-blocks-vite-plugin-'));
  const slotsDir = join(root, 'slots');

  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  await mkdir(join(slotsDir, '@path/about'), { recursive: true });
  await writeFile(
    join(slotsDir, '@path/about', 'hero.json'),
    JSON.stringify({
      name: 'hero',
      blocks: [{ id: 'about-card', type: 'CalloutCard', data: { title: 'About hero' } }],
    })
  );
  await writeFile(
    join(slotsDir, 'hero.json'),
    JSON.stringify({
      name: 'hero',
      blocks: [{ id: 'global-card', type: 'CalloutCard', data: { title: 'Global hero' } }],
    })
  );

  const plugin = pageBlocks({
    slotsDir,
    staticOutput: 'lazy-files',
    staticAssetDir: 'custom-page-blocks',
  });

  const configResult = await plugin.config(
    { root, base: '/preview/' },
    { command: 'build', mode: 'production', isSsrBuild: false }
  );
  const emitted = [];

  await plugin.generateBundle.call(
    {
      emitFile(asset) {
        emitted.push(asset);
        return asset.fileName;
      },
    },
    {},
    {}
  );

  const runtimeConfig = JSON.parse(configResult.define['globalThis.__PAGE_BLOCKS_VITE_CONFIG__']);
  const lazyManifest = JSON.parse(configResult.define['globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__']);

  assert.equal(runtimeConfig.mode, 'static');
  assert.equal(runtimeConfig.staticOutput, 'lazy-files');
  assert.equal(runtimeConfig.basePath, '/preview/');
  assert.equal(configResult.define['globalThis.__PAGE_BLOCKS_VITE_STATIC_MANIFEST__'], 'undefined');
  assert.equal(configResult.define['globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__'], 'true');
  assert.equal(JSON.stringify(lazyManifest).includes('About hero'), false);
  assert.deepEqual(
    lazyManifest.entries.map((entry) => entry.file).sort(),
    ['custom-page-blocks/@path/about/hero.json', 'custom-page-blocks/hero.json']
  );
  assert.deepEqual(
    emitted.map((asset) => asset.fileName).sort(),
    ['custom-page-blocks/@path/about/hero.json', 'custom-page-blocks/hero.json']
  );
  assert.equal(JSON.parse(emitted[0].source).slot, 'hero');
});

test('vite build emits lazy static JSON files outside the bundle payload', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'page-blocks-vite-build-'));
  const srcDir = join(root, 'src');
  const slotsDir = join(root, 'slots');

  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  await mkdir(srcDir, { recursive: true });
  await mkdir(join(slotsDir, '@path/about'), { recursive: true });
  await writeFile(
    join(srcDir, 'main.js'),
    'console.log(globalThis.__PAGE_BLOCKS_VITE_CONFIG__, globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__);'
  );
  await writeFile(
    join(slotsDir, 'hero.json'),
    JSON.stringify({
      name: 'hero',
      blocks: [{ id: 'global-card', type: 'CalloutCard', data: { title: 'Global hero' } }],
    })
  );
  await writeFile(
    join(slotsDir, '@path/about', 'hero.json'),
    JSON.stringify({
      name: 'hero',
      blocks: [{ id: 'about-card', type: 'CalloutCard', data: { title: 'About hero' } }],
    })
  );

  await build({
    configFile: false,
    root,
    base: '/preview/',
    logLevel: 'silent',
    plugins: [
      pageBlocks({
        staticOutput: 'lazy-files',
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: join(srcDir, 'main.js'),
        formats: ['es'],
        fileName: () => 'main.js',
      },
    },
  });

  const distDir = join(root, 'dist');
  const outputFiles = await readFilesRecursive(distDir);
  const jsFiles = outputFiles.filter((file) => file.endsWith('.js'));
  const bundleText = (await Promise.all(jsFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  const lazyHeroJson = await readFile(join(distDir, 'page-blocks', 'slots', '@path', 'about', 'hero.json'), 'utf8');

  assert.equal(existsSync(join(distDir, 'page-blocks', 'slots', 'hero.json')), true);
  assert.equal(existsSync(join(distDir, 'page-blocks', 'slots', '@path', 'about', 'hero.json')), true);
  assert.equal(bundleText.includes('About hero'), false);
  assert.equal(bundleText.includes('Global hero'), false);
  assert.equal(JSON.parse(lazyHeroJson).blocks[0].id, 'about-card');
});

test('vite includes the lazy editor boundary only in preview artifacts', async (t) => {
  const root = await mkdtemp(join(process.cwd(), '.page-blocks-vite-modes-'));
  const slotsDir = join(root, 'slots');
  t.after(async () => rm(root, { recursive: true, force: true }));

  await mkdir(slotsDir, { recursive: true });
  await writeFile(join(slotsDir, 'hero.json'), JSON.stringify({ name: 'hero', blocks: [] }));
  await writeFile(join(root, 'index.html'), '<main>Page Blocks</main><script type="module" src="/main.js"></script>');
  await writeFile(join(root, 'main.js'), 'console.log("SITE_ENTRY")');
  await writeFile(
    join(root, 'preview-bootstrap.js'),
    'export default async function previewBootstrap() { console.log("PREVIEW_BOOTSTRAP_MARKER") }'
  );

  const buildMode = (mode, outDir) => build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [pageBlocks({
      mode,
      ...(mode === 'preview' ? { preview: { bootstrap: './preview-bootstrap.js' } } : {}),
    })],
    build: { outDir, emptyOutDir: true },
  });
  await buildMode('static', 'dist-static');
  await buildMode('preview', 'dist-preview');

  const artifactText = async (directory) => {
    const files = await readFilesRecursive(join(root, directory));
    return (await Promise.all(files.filter((file) => /\.(?:html|js|css)$/.test(file)).map((file) => readFile(file, 'utf8')))).join('\n');
  };
  const staticArtifact = await artifactText('dist-static');
  const previewArtifact = await artifactText('dist-preview');
  assert.equal(staticArtifact.includes('PREVIEW_BOOTSTRAP_MARKER'), false);
  assert.equal(staticArtifact.includes('pb-editor'), false);
  assert.equal(previewArtifact.includes('PREVIEW_BOOTSTRAP_MARKER'), true);
  assert.equal(previewArtifact.includes('pb-editor'), true);
});

test('blueprint compiler builds manifest matches and applies mapFromProps', async () => {
  const pokemonBlueprint = design('Pokemon test', ({ Blocks, slots }) => {
    slots.add(
      'hero',
      { pokemon: '@all' },
      React.createElement(Blocks.TestCard, {
        id: 'default-card',
        title: 'Default hero',
      })
    );
    slots.add(
      'hero',
      { pokemon: 'pikachu' },
      React.createElement(Blocks.TestCard, {
        id: 'pikachu-card',
        title: 'Pikachu hero',
        variant: 'exact',
      })
    );
  });

  const compiled = await compileBlueprintModules({
    modules: [{ pokemonBlueprint }],
    contexts: ['pokemon'],
  });

  const exact = queryStaticManifest(compiled.manifest, { pokemon: 'pikachu' }, ['hero']);
  const fallback = queryStaticManifest(compiled.manifest, { pokemon: 'bulbasaur' }, ['hero']);

  assert.equal(exact.slots.hero.blocks[0].id, 'pikachu-card');
  assert.deepEqual(exact.slots.hero.blocks[0].data, {
    headline: 'Pikachu hero',
    variant: 'exact',
  });
  assert.equal(fallback.slots.hero.blocks[0].id, 'default-card');
});

test('blueprint compiler rejects duplicate ids within the same slot and match', async () => {
  const duplicateBlueprint = design('Duplicate ids', ({ Blocks, slots }) => {
    slots.add(
      'hero',
      {},
      React.createElement(Blocks.TestCard, {
        id: 'duplicate-card',
        title: 'First card',
      })
    );
    slots.add(
      'hero',
      {},
      React.createElement(Blocks.TestCard, {
        id: 'duplicate-card',
        title: 'Second card',
      })
    );
  });

  await assert.rejects(
    () =>
      compileBlueprintModules({
        modules: [{ duplicateBlueprint }],
        contexts: [],
      }),
    /duplicate block id/
  );
});

test('blueprint sync persists and prunes filesystem slot output', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'page-blocks-blueprints-'));
  const slotsDir = join(root, 'slots-generated');
  const blueprintFile = join(root, 'pokemon-design.js');

  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  await writeFile(blueprintFile, '// resolved through a custom test loader\n');

  const loader = createFileSystemLoader({
    path: slotsDir,
    contexts: ['pokemon'],
  });

  const firstBlueprint = design('First sync', ({ Blocks, slots }) => {
    slots.add(
      'hero',
      { pokemon: '@all' },
      React.createElement(Blocks.TestCard, {
        id: 'default-card',
        title: 'Default hero',
      })
    );
    slots.add(
      'hero',
      { pokemon: 'pikachu' },
      React.createElement(Blocks.TestCard, {
        id: 'pikachu-card',
        title: 'Pikachu hero',
      })
    );
  });

  await syncBlueprintFiles({
    root,
    designs: ['pokemon-design.js'],
    contexts: ['pokemon'],
    loader,
    loadModule: async () => ({ firstBlueprint }),
  });

  const firstResponse = await loader.query({ pokemon: 'pikachu' }, ['hero']);
  assert.equal(firstResponse.slots.hero.blocks[0].id, 'pikachu-card');
  assert.equal(existsSync(join(slotsDir, '@pokemon/pikachu/hero.json')), true);

  const secondBlueprint = design('Second sync', ({ Blocks, slots }) => {
    slots.add(
      'hero',
      { pokemon: '@all' },
      React.createElement(Blocks.TestCard, {
        id: 'default-card',
        title: 'Default hero',
      })
    );
  });

  await syncBlueprintFiles({
    root,
    designs: ['pokemon-design.js'],
    contexts: ['pokemon'],
    loader,
    loadModule: async () => ({ secondBlueprint }),
  });

  const secondResponse = await loader.query({ pokemon: 'pikachu' }, ['hero']);
  assert.equal(secondResponse.slots.hero.blocks[0].id, 'default-card');
  assert.equal(existsSync(join(slotsDir, '@pokemon/pikachu/hero.json')), false);
});
