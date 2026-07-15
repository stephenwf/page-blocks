import assert from 'node:assert/strict';
import { readdir, readFile, rm, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createSlotEditingClient, PageBlocksClientError } from 'page-blocks/client';
import {
  findSlotManifestMatch,
  parseSlotApiResponse,
  queryStaticManifest,
  slotApiRequestSchema,
  validateSlotManifestEntries,
} from 'page-blocks/core';
import {
  buildSlotFilePath,
  createFileSystemLoader,
  parseSingleFile,
  resolveWithinRoot,
} from 'page-blocks/file-system';
import { createRequestHandler } from 'page-blocks/node';

const temporaryDirectories = [];
const originalFetch = globalThis.fetch;
const originalConfig = globalThis.__PAGE_BLOCKS_VITE_CONFIG__;

afterEach(async () => {
  globalThis.fetch = originalFetch;
  if (typeof originalConfig === 'undefined') delete globalThis.__PAGE_BLOCKS_VITE_CONFIG__;
  else globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = originalConfig;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function tempDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'page-blocks-core-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeSlots(structure) {
  const directory = await tempDirectory();
  await Promise.all(
    Object.entries(structure).map(async ([file, data]) => {
      const target = join(directory, ...file.split('/'));
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
    })
  );
  return directory;
}

const block = { id: 'block-1', type: 'card', data: { title: 'Card' } };
const slot = { id: 'slot-1', slot: 'hero', blocks: [block] };
const context = { path: '/about' };
const parent = { slotId: 'slot-1', blockId: 'block-1' };

test('all protocol requests and responses have runtime schemas', () => {
  const requests = [
    { type: 'request-slots', slots: ['hero'], context },
    { type: 'create-slot', slot: 'hero', matches: [{ id: 'path', type: 'exact', value: '/about' }] },
    { type: 'update-slot', slotId: 'slot-1', data: { blocks: [] } },
    { type: 'delete-slot', slotId: 'slot-1' },
    { type: 'get-slot', slotId: 'slot-1' },
    { type: 'create-block', slotId: 'slot-1', block },
    { type: 'update-block', slotId: 'slot-1', blockId: 'block-1', block },
    { type: 'delete-block', slotId: 'slot-1', blockId: 'block-1' },
    { type: 'reorder-blocks', slotId: 'slot-1', blockIds: ['block-1'] },
    { type: 'update-slot-options', slotId: 'slot-1', options: { theme: 'dark' } },
    { type: 'update-block-props', slotId: 'slot-1', blockId: 'block-1', props: { title: 'Next' } },
    { type: 'move-block-up', slotId: 'slot-1', blockId: 'block-1' },
    { type: 'move-block-down', slotId: 'slot-1', blockId: 'block-1' },
    { type: 'create-inner-slot', slotId: 'details', parent, slot: 'details' },
    { type: 'delete-inner-slot', slotId: 'details', parent },
    { type: 'update-inner-slot', slotId: 'details', parent, data: { blocks: [] } },
    { type: 'generate-screenshots' },
    { type: 'query-context-values', context: 'path' },
    { type: 'query-sub-context', context },
    { type: 'query-sub-context-blocks', context, options: { slotIds: ['hero'], blockTypes: ['card'] } },
  ];
  requests.forEach((request) => assert.equal(slotApiRequestSchema.parse(request).type, request.type));

  const successes = new Set([
    'update-slot',
    'delete-slot',
    'update-block',
    'delete-block',
    'reorder-blocks',
    'update-slot-options',
    'update-block-props',
    'move-block-up',
    'move-block-down',
    'create-inner-slot',
    'delete-inner-slot',
    'update-inner-slot',
    'generate-screenshots',
  ]);
  for (const request of requests) {
    let response = { success: true };
    if (request.type === 'request-slots') response = { slots: { hero: slot }, isEmpty: false, slotNames: ['hero'], context };
    else if (request.type === 'create-slot' || request.type === 'get-slot') response = slot;
    else if (request.type === 'create-block') response = block;
    else if (request.type === 'query-context-values') response = ['/about'];
    else if (request.type === 'query-sub-context') response = [{ country: 'japan' }];
    else if (request.type === 'query-sub-context-blocks') response = [{ context, blocks: [block] }];
    else assert.equal(successes.has(request.type), true);
    assert.doesNotThrow(() => parseSlotApiResponse(request.type, response));
  }

  assert.equal(slotApiRequestSchema.safeParse({ type: 'unknown' }).success, false);
  assert.equal(
    slotApiRequestSchema.safeParse({ type: 'create-slot', slot: 'hero', matches: [
      { id: 'path', type: 'all' },
      { id: 'path', type: 'none' },
    ] }).success,
    false
  );
  assert.equal(slotApiRequestSchema.safeParse({ type: 'update-block-props', slotId: 's', blockId: 'b', props: undefined }).success, false);
});

test('the current dispatcher rejects malformed input and invalidates successful writes only', async () => {
  let initialized = 0;
  let queried = 0;
  let updated = 0;
  let invalidated = 0;
  const handler = createRequestHandler({
    loader: {
      async init() { initialized += 1; },
      async query(requestContext) {
        queried += 1;
        return { slots: {}, isEmpty: true, slotNames: [], context: requestContext };
      },
      async update() { updated += 1; },
    },
    async invalidateSlots() { invalidated += 1; },
  });

  const malformed = await handler({ type: 'update-slot', slotId: '../outside', data: { blocks: [], extra: undefined } });
  assert.equal(malformed.status, 400);
  assert.equal(initialized, 0);

  const read = await handler({ type: 'request-slots', slots: [], context: {} });
  assert.equal(read.status, 200);
  assert.equal(queried, 1);
  assert.equal(invalidated, 0);

  const write = await handler({ type: 'update-slot', slotId: 'slot-1', data: { blocks: [] } });
  assert.equal(write.status, 200);
  assert.equal(updated, 1);
  assert.equal(invalidated, 1);
});

test('client errors are typed and mutation callbacks only follow successful writes', async () => {
  globalThis.__PAGE_BLOCKS_VITE_CONFIG__ = {
    mode: 'local',
    readOnly: false,
    apiPath: '/api/page-blocks',
    contexts: ['path'],
    defaultContexts: ['path'],
  };

  let mutations = 0;
  const client = createSlotEditingClient({}, { onMutation: () => { mutations += 1; } });
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      async json() {
        if (request.type === 'query') {
          return { slots: {}, isEmpty: true, slotNames: [], context: request.context };
        }
        if (request.type === 'get') {
          return {
            document: {
              id: 'slot-1', scope: 'local', version: 1,
              locator: { slot: 'hero', matches: [] }, document: { blocks: [] },
            },
            target: { id: 'slot-1', slot: 'hero', blocks: [], version: 1 },
          };
        }
        return request.type === 'query'
          ? { slots: {}, isEmpty: true, slotNames: [], context: request.context }
          : {
              document: {
                id: 'slot-1', scope: 'local', version: 2,
                locator: { slot: 'hero', matches: [] }, document: { blocks: [] },
              },
              target: { id: 'slot-1', slot: 'hero', blocks: [], version: 2 },
            };
      },
    };
  };

  await client.getSlotList({}, []);
  assert.equal(mutations, 0);
  await client.updateSlot('slot-1', { blocks: [] });
  assert.equal(mutations, 1);

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    async json() {
      return { error: { code: 'conflict', message: 'Document changed.' } };
    },
  });
  await assert.rejects(
    () => client.updateSlot('slot-1', { blocks: [] }),
    (error) => error instanceof PageBlocksClientError && error.status === 409 && error.code === 'conflict'
  );
  assert.equal(mutations, 1);
});

test('static and filesystem adapters share matching conformance fixtures', async () => {
  const files = {
    'hero.json': { name: 'hero', blocks: [{ id: 'global', type: 'card', data: {} }] },
    '@path/hero.json': { name: 'hero', blocks: [{ id: 'root', type: 'card', data: {} }] },
    '@path/about/hero.json': { name: 'hero', blocks: [{ id: 'about', type: 'card', data: {} }] },
    '@path/about/team/content.main.json': { name: 'content.main', blocks: [{ id: 'team', type: 'card', data: {} }] },
    '@path:all/footer.json': { name: 'footer', blocks: [{ id: 'footer', type: 'card', data: {} }] },
  };
  const directory = await writeSlots(files);
  const contexts = ['path'];
  const entries = Object.keys(files).map((file) => parseSingleFile(file, contexts));
  const manifest = {
    contexts,
    entries,
    slots: Object.fromEntries(entries.map((entry) => [entry.id, { ...files[Object.keys(files).find((file) => parseSingleFile(file, contexts).id === entry.id)], id: entry.id, slot: entry.slot }])),
  };
  const loader = createFileSystemLoader({ path: directory, contexts });

  const fixtures = [
    [{}, { hero: 'global' }],
    [{ path: '/' }, { footer: 'footer', hero: 'root' }],
    [{ path: '/about/' }, { footer: 'footer', hero: 'about' }],
    [{ path: '/about/team/' }, { 'content.main': 'team', footer: 'footer', hero: 'global' }],
  ];
  for (const [query, expected] of fixtures) {
    const staticResult = queryStaticManifest(manifest, query);
    const fileResult = await loader.query(query);
    const summarize = (result) => Object.fromEntries(
      Object.entries(result.slots).sort().map(([name, value]) => [name, value.blocks[0].id])
    );
    assert.deepEqual(summarize(staticResult), expected);
    assert.deepEqual(summarize(fileResult), expected);
    assert.deepEqual(fileResult.context, staticResult.context);
  }
});

test('matcher rejects duplicate and equal-specificity ambiguous locators deterministically', () => {
  const duplicate = [
    { id: 'first', slot: 'hero', specificity: 9, contexts: [{ id: 'path', specificity: 9, match: { type: 'exact', value: '/about' } }] },
    { id: 'second', slot: 'hero', specificity: 9, contexts: [{ id: 'path', specificity: 9, match: { type: 'exact', value: '/about/' } }] },
  ];
  assert.throws(() => validateSlotManifestEntries(['path'], duplicate), /Duplicate slot locator/);

  const ambiguous = [
    duplicate[0],
    { id: 'all', slot: 'hero', specificity: 9, contexts: [{ id: 'path', specificity: 9, match: { type: 'all' } }] },
  ];
  assert.throws(() => validateSlotManifestEntries(['path'], ambiguous), /Ambiguous slot locators/);
  assert.throws(() => findSlotManifestMatch(['path'], { path: '/about' }, ambiguous), /Ambiguous slot locators/);
});

test('filesystem IDs, paths, writes, reorders, and nested option updates are safe', async () => {
  const directory = await writeSlots({
    'hero.json': {
      name: 'hero',
      blocks: [
        { id: 'a', type: 'card', data: {}, slots: { details: { blocks: [] } } },
        { id: 'b', type: 'card', data: {} },
      ],
    },
  });
  const outside = join(directory, '..', `outside-${Date.now()}.json`);
  await writeFile(outside, '{"secret":true}');
  const loader = createFileSystemLoader({ path: directory, contexts: ['path', 'country'] });
  const response = await loader.query({});
  const hero = response.slots.hero;

  assert.match(hero.id, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hero.source.filePath, 'hero.json');
  await assert.rejects(() => loader.find(Buffer.from('../outside.json').toString('base64')), /Unknown Page Blocks document id/);
  assert.throws(() => resolveWithinRoot(directory, '../outside.json'), /escapes/);
  await assert.rejects(() => loader.createSlot({ slot: '../escape', matches: [] }));
  await assert.rejects(() => loader.createSlot({ slot: 'other', matches: [{ id: 'country', type: 'exact', value: '../japan' }] }));
  await assert.rejects(() => loader.createSlot({ slot: 'hero', matches: [] }), /already exists/);

  const beforeReorder = await readFile(join(directory, 'hero.json'), 'utf8');
  await assert.rejects(() => loader.reorderBlocks(hero.id, ['a']), /every current block id exactly once/);
  assert.equal(await readFile(join(directory, 'hero.json'), 'utf8'), beforeReorder);
  await loader.reorderBlocks(hero.id, ['b', 'a']);
  assert.deepEqual((await loader.find(hero.id)).blocks.map((item) => item.id), ['b', 'a']);

  await loader.updateSlotOptions('details', { tone: 'quiet' }, { slotId: hero.id, blockId: 'a' });
  const updated = await loader.find(hero.id);
  assert.equal(updated.options, undefined);
  assert.deepEqual(updated.blocks.find((item) => item.id === 'a').slots.details.options, { tone: 'quiet' });
  assert.deepEqual((await readdir(directory)).filter((file) => file.endsWith('.tmp')), []);
  assert.equal(await readFile(outside, 'utf8'), '{"secret":true}');
  await rm(outside, { force: true });
});

test('filesystem handles root paths, dotted slots, encoded values, sub-contexts, and duplicate locators', async () => {
  const rootPath = buildSlotFilePath('content.main', [{ id: 'path', type: 'exact', value: '/' }], ['path']);
  assert.equal(rootPath, '@path/content.main.json');
  assert.equal(parseSingleFile(rootPath.replaceAll('/', '\\'), ['path']).slot, 'content.main');
  assert.equal(parseSingleFile(rootPath, ['path']).contexts[0].match.value, '/');

  const directory = await writeSlots({
    '@path/offers/@country/japan/offers.json': { name: 'offers', blocks: [{ id: 'japan', type: 'offer', data: {} }] },
    '@path/offers/@country/portugal/offers.json': { name: 'offers', blocks: [{ id: 'portugal', type: 'offer', data: {} }] },
  });
  const loader = createFileSystemLoader({ path: directory, contexts: ['path', 'country'] });
  assert.deepEqual(await loader.querySubContext({ path: '/offers/' }), [{ country: 'japan' }, { country: 'portugal' }]);
  const blocks = await loader.querySubContextBlocks({ path: '/offers' }, { slotIds: ['offers'] });
  assert.deepEqual(blocks.map((result) => [result.context.country, result.blocks[0].id]), [
    ['japan', 'japan'],
    ['portugal', 'portugal'],
  ]);

  const duplicateDirectory = await writeSlots({
    '@path/about/hero.json': { name: 'hero', blocks: [] },
    '@path/%61bout/hero.json': { name: 'hero', blocks: [] },
  });
  await assert.rejects(
    () => createFileSystemLoader({ path: duplicateDirectory, contexts: ['path'] }).init(),
    /Duplicate slot locator/
  );
});
