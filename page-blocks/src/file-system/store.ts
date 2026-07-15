import { CreateSlot, SlotDocument, SlotResponse, slotDocumentSchema } from '../core';
import { PageBlocksConflictError } from '../server/errors';
import type { PageBlocksStore, StoredPageBlocksDocument } from '../server/types';
import { createFileSystemLoader } from './index';

function cleanDocument(slot: SlotResponse | SlotDocument): SlotDocument {
  return slotDocumentSchema.parse({
    ...(slot.name ? { name: slot.name } : {}),
    blocks: slot.blocks,
    ...(typeof slot.options === 'undefined' ? {} : { options: slot.options }),
  });
}

function locatorFromSlot(slot: SlotResponse): CreateSlot {
  return {
    slot: slot.slot,
    matches: (slot.source?.matchedContexts || []).map((match) =>
      match.type === 'exact'
        ? { id: match.id, type: 'exact' as const, value: match.value || '' }
        : { id: match.id, type: match.type }
    ),
  };
}

export function createFileSystemStore(options: {
  path: string;
  contexts: string[];
  scope?: string;
  loader?: ReturnType<typeof createFileSystemLoader>;
}): PageBlocksStore {
  const scope = options.scope || 'default';
  const loader = options.loader || createFileSystemLoader(options);
  const locks = new Map<string, Promise<void>>();

  const stored = (documentScope: string, locator: CreateSlot, slot: SlotResponse): StoredPageBlocksDocument => ({
    id: slot.id,
    scope: documentScope,
    locator,
    version: slot.version || 1,
    document: cleanDocument(slot),
  });

  const serial = async <Result>(documentId: string, run: () => Promise<Result>) => {
    const previous = locks.get(documentId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => current);
    locks.set(documentId, tail);
    await previous.catch(() => undefined);
    try {
      return await run();
    } finally {
      release();
      if (locks.get(documentId) === tail) locks.delete(documentId);
    }
  };

  return {
    async query(documentScope, context, slots) {
      if (documentScope !== scope) return [];
      const response = await loader.query(context, slots);
      return Object.values(response.slots).map((slot) => stored(scope, locatorFromSlot(slot), slot));
    },

    async list(documentScope) {
      if (documentScope !== scope) return [];
      return (await loader.listSlotDocuments()).map(({ locator, document }) => stored(scope, locator, document));
    },

    async get(documentScope, documentId) {
      if (documentScope !== scope) return null;
      try {
        const slot = await loader.find(documentId);
        return stored(scope, locatorFromSlot(slot), slot);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Unknown Page Blocks document id')) return null;
        throw error;
      }
    },

    async create(documentScope, locator, document) {
      if (documentScope !== scope) throw new Error(`Filesystem store is configured for scope "${scope}".`);
      const created = await loader.createSlot(locator);
      await loader.update(created.id, { ...cleanDocument(document), version: 1 });
      return stored(scope, locator, await loader.find(created.id));
    },

    async save(documentScope, documentId, expectedVersion, document) {
      if (documentScope !== scope) throw new Error(`Filesystem store is configured for scope "${scope}".`);
      return serial(documentId, async () => {
        const current = await loader.find(documentId);
        const currentVersion = current.version || 1;
        if (currentVersion !== expectedVersion) {
          throw new PageBlocksConflictError(
            `Document "${documentId}" is at version ${currentVersion}, not ${expectedVersion}.`
          );
        }
        await loader.update(documentId, { ...cleanDocument(document), version: currentVersion + 1 });
        return stored(scope, locatorFromSlot(current), await loader.find(documentId));
      });
    },

    async delete(documentScope, documentId, expectedVersion) {
      if (documentScope !== scope) throw new Error(`Filesystem store is configured for scope "${scope}".`);
      await serial(documentId, async () => {
        const current = await loader.find(documentId);
        const currentVersion = current.version || 1;
        if (currentVersion !== expectedVersion) {
          throw new PageBlocksConflictError(
            `Document "${documentId}" is at version ${currentVersion}, not ${expectedVersion}.`
          );
        }
        await loader.delete(documentId);
      });
    },
  };
}
