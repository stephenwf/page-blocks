import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createPageBlocksRemoteClient, PageBlocksClientError } from 'page-blocks/client';
import { createFileSystemStore } from 'page-blocks/file-system';
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
          detail: { blocks: [{ id: 'card', type: 'card', data: { title: 'Before' } }] },
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
