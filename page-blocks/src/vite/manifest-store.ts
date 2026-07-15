import { CreateSlot, PageBlocksStaticManifest, SlotDocument, queryStaticManifest } from '../core';
import { PageBlocksForbiddenError } from '../server/errors';
import type { PageBlocksStore, StoredPageBlocksDocument } from '../server/types';

export function createManifestStore(
  getManifest: () => PageBlocksStaticManifest,
  configuredScope = 'local'
): PageBlocksStore {
  const record = (id: string): StoredPageBlocksDocument | null => {
    const manifest = getManifest();
    const entry = manifest.entries.find((candidate) => candidate.id === id);
    const slot = manifest.slots[id];
    if (!entry || !slot) return null;
    return {
      id,
      scope: configuredScope,
      locator: {
        slot: entry.slot,
        matches: entry.contexts.map((context) => ({ id: context.id, ...context.match })) as CreateSlot['matches'],
      },
      version: slot.version || 1,
      document: { name: slot.name, blocks: slot.blocks, options: slot.options },
    };
  };

  const list = () => getManifest().entries.map((entry) => record(entry.id)!).filter(Boolean);
  const readOnly = async (): Promise<never> => {
    throw new PageBlocksForbiddenError('Compiled Page Blocks blueprints are read-only.');
  };

  return {
    async query(scope, context, slots) {
      if (scope !== configuredScope) return [];
      const response = queryStaticManifest(getManifest(), context, slots);
      return Object.values(response.slots).map((slot) => record(slot.id)!).filter(Boolean);
    },
    async list(scope) {
      return scope === configuredScope ? list() : [];
    },
    async get(scope, id) {
      return scope === configuredScope ? record(id) : null;
    },
    create: readOnly as (scope: string, locator: CreateSlot, document: SlotDocument) => Promise<StoredPageBlocksDocument>,
    save: readOnly as PageBlocksStore['save'],
    delete: readOnly as PageBlocksStore['delete'],
  };
}
