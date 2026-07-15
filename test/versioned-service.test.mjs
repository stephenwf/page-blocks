import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createPageBlocksRemoteClient, PageBlocksClientError } from 'page-blocks/client';
import { createFileSystemLoader, createFileSystemStore } from 'page-blocks/file-system';
import {
  exportPageBlocksSnapshot,
  importPageBlocksDirectory,
  pageBlocksSnapshotManifestFile,
} from 'page-blocks/file-system';
import { createDirectoryContract, createDirectoryManifest } from 'page-blocks/core';
import { z } from 'zod';
import {
  createPageBlocksHandler,
  createPageBlocksService,
  PageBlocksConflictError,
} from 'page-blocks/server';

const temporaryDirectories = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMemoryStore(seed = []) {
  const records = new Map(seed.map((record) => [record.id, clone(record)]));
  return {
    async query(scope, context, slots) {
      return [...records.values()].filter((record) =>
        record.scope === scope &&
        (!slots?.length || slots.includes(record.locator.slot)) &&
        record.locator.matches.every((match) =>
          match.type === 'exact' ? context[match.id] === match.value : match.type === 'all' ? match.id in context : !(match.id in context)
        )
      ).map(clone);
    },
    async list(scope) {
      return [...records.values()].filter((record) => record.scope === scope).map(clone);
    },
    async get(scope, id) {
      const record = records.get(id);
      return record?.scope === scope ? clone(record) : null;
    },
    async create(scope, locator, document) {
      const id = `document-${records.size + 1}`;
      const record = { id, scope, locator: clone(locator), version: 1, document: clone(document) };
      records.set(id, record);
      return clone(record);
    },
    async save(scope, id, expectedVersion, document) {
      const current = records.get(id);
      if (!current || current.scope !== scope) throw new Error('missing');
      if (current.version !== expectedVersion) throw new PageBlocksConflictError('stale');
      const saved = { ...current, version: current.version + 1, document: clone(document) };
      records.set(id, saved);
      return clone(saved);
    },
    async delete(scope, id, expectedVersion) {
      const current = records.get(id);
      if (!current || current.scope !== scope) throw new Error('missing');
      if (current.version !== expectedVersion) throw new PageBlocksConflictError('stale');
      records.delete(id);
    },
  };
}

const nestedDocument = {
  blocks: [{
    id: 'outer', type: 'layout', data: {}, slots: {
      column: { blocks: [{
        id: 'inner', type: 'layout', data: {}, slots: {
          detail: { slot_id: 'detail', blocks: [{ id: 'card', type: 'card', data: { title: 'Before' } }] },
        },
      }] },
    },
  }],
};

test('the service owns arbitrary-depth mutations and rejects stale revisions without overwriting', async () => {
  const store = createMemoryStore([{
    id: 'document-1', scope: 'tenant', version: 1,
    locator: { slot: 'hero', matches: [] }, document: nestedDocument,
  }]);
  const service = createPageBlocksService({ store });
  const target = {
    documentId: 'document-1',
    path: [{ blockId: 'outer', slot: 'column' }, { blockId: 'inner', slot: 'detail' }],
  };

  const updated = await service.mutate('tenant', target, 1, {
    type: 'update-block-props', blockId: 'card', props: { title: 'After' },
  });
  assert.equal(updated.document.version, 2);
  assert.deepEqual(updated.target.blocks[0].data, { title: 'After' });
  assert.equal(updated.target.slot, 'detail');
  assert.equal('slot_id' in updated.target, false);

  await assert.rejects(
    () => service.mutate('tenant', target, 1, { type: 'delete-block', blockId: 'card' }),
    (error) => error.code === 'conflict' && error.status === 409
  );
  assert.deepEqual((await service.get('tenant', target)).target.blocks[0].data, { title: 'After' });

  await assert.rejects(
    () => service.mutate('tenant', target, 2, { type: 'reorder-blocks', blockIds: [] }),
    /every current block id exactly once/
  );
  assert.equal((await service.get('tenant', target)).document.version, 2);
});

test('the fetch handler validates before access, defaults writes closed, and returns stable errors', async () => {
  let storeReads = 0;
  const store = createMemoryStore([]);
  const originalList = store.list;
  store.list = async (...args) => { storeReads += 1; return originalList(...args); };
  const service = createPageBlocksService({ store });
  const closed = createPageBlocksHandler({ service, scope: 'tenant', maximumBodySize: 100 });
  const request = (body) => new Request('https://example.test/page-blocks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });

  const malformed = await closed(request({ type: 'unknown' }));
  assert.equal(malformed.status, 400);
  assert.equal(storeReads, 0);

  const read = await closed(request({ type: 'context-values', context: 'path' }));
  assert.equal(read.status, 200);
  assert.equal(storeReads, 1);

  const write = await closed(request({ type: 'create', locator: { slot: 'hero', matches: [] } }));
  assert.equal(write.status, 403);

  const oversized = await closed(new Request('https://example.test/page-blocks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'query', context: { path: 'x'.repeat(200) } }),
  }));
  assert.equal(oversized.status, 413);

  const open = createPageBlocksHandler({ service, scope: 'tenant', authorize: ({ operation }) => operation === 'write' });
  const created = await open(request({ type: 'create', locator: { slot: 'hero', matches: [] } }));
  assert.equal(created.status, 200);
  assert.equal((await created.json()).document.version, 1);
});

test('the typed remote client carries authorization and exposes service errors', async () => {
  const service = createPageBlocksService({ store: createMemoryStore([]) });
  const handler = createPageBlocksHandler({
    service,
    scope: 'tenant',
    authorize: ({ request }) => request.headers.get('authorization') === 'Bearer secret',
  });
  const fetch = (input, init) => handler(new Request(input, init));
  const authorized = createPageBlocksRemoteClient({
    endpoint: 'https://example.test/page-blocks', fetch,
    headers: async () => ({ authorization: 'Bearer secret' }),
  });
  const created = await authorized.create({ slot: 'hero', matches: [] });
  assert.equal(created.document.version, 1);

  const denied = createPageBlocksRemoteClient({ endpoint: 'https://example.test/page-blocks', fetch });
  await assert.rejects(
    () => denied.get({ documentId: created.document.id, path: [] }),
    (error) => error instanceof PageBlocksClientError && error.status === 403 && error.code === 'forbidden'
  );
});

test('the filesystem store persists revisions and compare-and-swap conflicts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'page-blocks-store-'));
  temporaryDirectories.push(directory);
  await writeFile(join(directory, 'hero.json'), `${JSON.stringify({ name: 'hero', blocks: [] })}\n`);
  const store = createFileSystemStore({ path: directory, contexts: [], scope: 'tenant' });
  const [record] = await store.query('tenant', {}, ['hero']);
  assert.equal(record.version, 1);

  const saved = await store.save('tenant', record.id, 1, { blocks: [{ id: 'card', type: 'card', data: {} }] });
  assert.equal(saved.version, 2);
  await assert.rejects(() => store.save('tenant', record.id, 1, { blocks: [] }), /version 2, not 1/);
  assert.equal(JSON.parse(await readFile(join(directory, 'hero.json'), 'utf8')).version, 2);
});

test('directory contracts validate block props, declared inner slots, and top-level policies', async () => {
  const manifest = createDirectoryManifest({
    version: '2026-07',
    contexts: { required: ['path'], optional: [] },
    blocks: [{
      type: 'card', label: 'Card', innerSlots: {}, requiredContexts: [], optionalContexts: [],
      form: { type: 'object', required: ['title'] },
    }],
    slots: [{ name: 'hero', policy: { allowedBlocks: ['card'], maxItems: 1 } }],
    aliases: { oldCard: 'card' }, migrations: [], presets: [],
  });
  const directory = createDirectoryContract(manifest, {
    card: z.object({ title: z.string().min(1) }),
  });
  const service = createPageBlocksService({ store: createMemoryStore([]), directory });
  const created = await service.create('tenant', { slot: 'hero', matches: [] }, {
    blocks: [{ id: 'one', type: 'oldCard', data: { title: 'Valid' } }],
  });
  assert.equal(created.document.version, 1);
  await assert.rejects(
    () => service.mutate('tenant', { documentId: created.document.id, path: [] }, 1, {
      type: 'create-block', block: { id: 'two', type: 'card', data: { title: 'Too many' } },
    }),
    (error) => error.status === 400 && /at most 1/.test(error.message)
  );
  await assert.rejects(
    () => service.create('tenant', { slot: 'hero', matches: [] }, {
      blocks: [{ id: 'bad', type: 'card', data: { title: '' } }],
    }),
    (error) => error.status === 400
  );
});

test('snapshot export is deterministic, atomic, checksummed, and round-trips into the matcher', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'page-blocks-snapshot-'));
  temporaryDirectories.push(parent);
  const first = join(parent, 'first');
  const second = join(parent, 'second');
  const documents = [
    {
      locator: { slot: 'hero', matches: [{ id: 'path', type: 'exact', value: '/about' }] },
      version: 3,
      document: { blocks: [{ id: 'about', type: 'card', data: { title: 'About' } }] },
    },
    {
      locator: { slot: 'hero', matches: [] },
      version: 2,
      document: { blocks: [{ id: 'global', type: 'card', data: { title: 'Global' } }] },
    },
  ];
  const options = {
    documents, contexts: ['path'], directoryVersion: '2026-07', sourceRevision: 'revision-42',
  };
  const firstManifest = await exportPageBlocksSnapshot({ ...options, targetDirectory: first });
  const secondManifest = await exportPageBlocksSnapshot({ ...options, targetDirectory: second });
  assert.deepEqual(firstManifest, secondManifest);
  assert.equal(
    await readFile(join(first, pageBlocksSnapshotManifestFile), 'utf8'),
    await readFile(join(second, pageBlocksSnapshotManifestFile), 'utf8')
  );

  const imported = await importPageBlocksDirectory({
    sourceDirectory: first, expectedDirectoryVersion: '2026-07', scope: 'tenant',
  });
  assert.deepEqual(imported.documents.map((record) => record.version), [3, 2]);
  const loader = createFileSystemLoader({ path: first, contexts: ['path'] });
  assert.equal((await loader.query({ path: '/about/' }, ['hero'])).slots.hero.blocks[0].id, 'about');

  const aboutFile = firstManifest.files.find((file) => file.path.includes('@path'));
  await writeFile(join(first, aboutFile.path), '{"tampered":true}\n');
  await assert.rejects(() => importPageBlocksDirectory({ sourceDirectory: first }), /checksum failed/);
  await assert.rejects(() => exportPageBlocksSnapshot({ ...options, targetDirectory: second }));
});
