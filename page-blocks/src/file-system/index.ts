import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import {
  BlockWithOptionalSlotResponse,
  canonicalSlotLocatorKey,
  CreateSlot,
  FullSlotLoader,
  normalizeSlotResponse,
  SlotSourceContextMatch,
  SlotSourceMetadata,
  validateSlotManifestEntries,
} from '../core';
import { loaderAdapter } from '../node';
import { findMatch } from './find-match';
import { findSubContexts } from './find-sub-contexts';
import { parseSingleFile } from './parse-single-file';
import { buildSlotFilePath, contextFlatNodeToMatches } from './slot-path';
import { ContextFlatNode } from './types';
import { atomicWriteFile, readAllFiles, resolveWithinRoot } from './utils';

export interface BlueprintSyncAdapter {
  upsertBlueprintSlot(request: CreateSlot & { data: unknown }): Promise<void>;
  deleteBlueprintSlot(request: CreateSlot): Promise<void>;
  listBlueprintSlots(): Promise<Array<{ slot: string; matches: CreateSlot['matches'] }>>;
  listSlotDocuments(): Promise<Array<{ locator: CreateSlot; document: ReturnType<typeof normalizeSlotResponse> }>>;
}

type IndexedSlot = {
  entry: ContextFlatNode;
  relativePath: string;
  absolutePath: string;
};

function formatJson(data: unknown) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function createFileSystemLoader(options: { path: string; contexts: string[] }): FullSlotLoader & BlueprintSyncAdapter {
  const root = resolve(options.path);
  let parsed: ContextFlatNode[] = [];
  let index = new Map<string, IndexedSlot>();
  let fresh = false;

  const sortByContextOrder = <T extends { id: string }>(values: T[]) =>
    [...values].sort((left, right) => options.contexts.indexOf(left.id) - options.contexts.indexOf(right.id));

  const toMatchedContexts = (
    entry?: ContextFlatNode | null,
    fallbackMatches?: CreateSlot['matches']
  ): SlotSourceContextMatch[] => {
    const matches = entry ? entry.contexts.map((context) => ({ id: context.id, ...context.match })) : fallbackMatches || [];
    return sortByContextOrder(matches).map((match) =>
      match.type === 'exact'
        ? { id: match.id, type: 'exact', value: match.value }
        : { id: match.id, type: match.type }
    );
  };

  const createSourceMetadata = (
    relativePath: string,
    entry?: ContextFlatNode | null,
    fallbackMatches?: CreateSlot['matches']
  ): SlotSourceMetadata => ({
    filePath: relativePath,
    matchedContexts: toMatchedContexts(entry, fallbackMatches),
  });

  const stripSlotSource = (data: unknown) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }
    const { source: _source, ...persisted } = data as Record<string, unknown>;
    return persisted;
  };

  const getIndexedSlot = (slotId: string) => {
    const found = index.get(slotId);
    if (!found) {
      throw new Error(`Unknown Page Blocks document id "${slotId}".`);
    }
    return found;
  };

  const readIndexedSlot = async (found: IndexedSlot) => {
    const data = JSON.parse(await readFile(found.absolutePath, { encoding: 'utf8', flag: 'r' }));
    return normalizeSlotResponse(found.entry.id, found.entry.slot, {
      ...data,
      source: createSourceMetadata(found.relativePath, found.entry),
    });
  };

  const loader = loaderAdapter({
    async init(force = false) {
      await mkdir(root, { recursive: true });
      if (!force && fresh) {
        return;
      }

      const nextIndex = new Map<string, IndexedSlot>();
      for (const file of [...readAllFiles(root)].sort()) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const relativePath = relative(root, file).replaceAll('\\', '/');
        const entry = parseSingleFile(relativePath, options.contexts);
        if (!entry) {
          continue;
        }
        if (nextIndex.has(entry.id)) {
          throw new Error(`Page Blocks document id collision for "${relativePath}".`);
        }
        nextIndex.set(entry.id, {
          entry,
          relativePath,
          absolutePath: resolveWithinRoot(root, relativePath),
        });
      }

      const nextParsed = [...nextIndex.values()]
        .map(({ entry }) => entry)
        .sort((left, right) => canonicalSlotLocatorKey(options.contexts, left).localeCompare(canonicalSlotLocatorKey(options.contexts, right)));
      validateSlotManifestEntries(options.contexts, nextParsed, (entry) => nextIndex.get(entry.id)?.relativePath || entry.id);
      index = nextIndex;
      parsed = nextParsed;
      fresh = true;
    },

    async query(context: Record<string, string>, slotIds?: string[]) {
      await this.init();
      const matches = findMatch(options.contexts, context, parsed, slotIds);
      const slots: Record<string, Awaited<ReturnType<typeof readIndexedSlot>>> = {};

      for (const [slotName, matchedSlot] of Object.entries(matches.slots)) {
        slots[slotName] = await readIndexedSlot(getIndexedSlot(matchedSlot.id));
      }
      const slotNames = Object.keys(slots);
      return { slots, isEmpty: slotNames.length === 0, slotNames, context: matches.context };
    },

    async find(slotId: string) {
      await this.init();
      return readIndexedSlot(getIndexedSlot(slotId));
    },

    async update(slotId: string, data: unknown) {
      await this.init();
      const found = getIndexedSlot(slotId);
      await atomicWriteFile(found.absolutePath, formatJson(stripSlotSource(data)));
      await this.init(true);
    },

    async createSlot(request: CreateSlot) {
      await this.init();
      const relativePath = buildSlotFilePath(request.slot, request.matches, options.contexts);
      const absolutePath = resolveWithinRoot(root, relativePath);
      const data = { name: request.slot, blocks: [], version: 1 };

      try {
        await atomicWriteFile(absolutePath, formatJson(data), { create: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          throw new Error(`A slot already exists at "${relativePath}".`);
        }
        throw error;
      }

      await this.init(true);
      const entry = parseSingleFile(relativePath, options.contexts)!;
      return normalizeSlotResponse(entry.id, entry.slot, {
        ...data,
        source: createSourceMetadata(relativePath, entry, request.matches),
      });
    },

    async delete(slotId: string) {
      await this.init();
      const found = getIndexedSlot(slotId);
      await unlink(found.absolutePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      await this.init(true);
    },

    async queryContextValues(context: string) {
      await this.init();
      const values = new Set<string>();
      for (const item of parsed) {
        for (const match of item.contexts) {
          if (match.id === context && match.match.type === 'exact') {
            values.add(match.match.value);
          }
        }
      }
      return [...values].sort();
    },

    async querySubContext(context: Record<string, string>) {
      await this.init();
      return findSubContexts(options.contexts, context, parsed);
    },

    async querySubContextBlocks(context, query) {
      await this.init();
      const allMatches: Array<{ context: Record<string, string>; blocks: BlockWithOptionalSlotResponse[] }> = [];

      for (const subContext of findSubContexts(options.contexts, context, parsed)) {
        const fullContext = { ...context, ...subContext };
        const matches = findMatch(options.contexts, fullContext, parsed, query?.slotIds);
        const foundBlocks: BlockWithOptionalSlotResponse[] = [];

        for (const match of Object.values(matches.slots)) {
          const slot = await readIndexedSlot(getIndexedSlot(match.id));
          foundBlocks.push(
            ...slot.blocks.filter((block) => {
              if (query?.blockTypes && !query.blockTypes.includes(block.type)) return false;
              if (query?.searchValue) {
                return JSON.stringify(block.data).toLowerCase().includes(query.searchValue.toLowerCase());
              }
              return true;
            })
          );
        }
        allMatches.push({ context: fullContext, blocks: foundBlocks });
      }
      return allMatches;
    },
  });

  return Object.assign(loader, {
    async upsertBlueprintSlot(request: CreateSlot & { data: unknown }) {
      const relativePath = buildSlotFilePath(request.slot, request.matches, options.contexts);
      await atomicWriteFile(resolveWithinRoot(root, relativePath), formatJson(request.data));
      await loader.init(true);
    },
    async deleteBlueprintSlot(request: CreateSlot) {
      const relativePath = buildSlotFilePath(request.slot, request.matches, options.contexts);
      const target = resolveWithinRoot(root, relativePath);
      if (existsSync(target)) {
        await unlink(target);
      }
      await loader.init(true);
    },
    async listBlueprintSlots() {
      await loader.init();
      return parsed.map((entry) => ({
        slot: entry.slot,
        matches: contextFlatNodeToMatches(entry, options.contexts),
      }));
    },
    async listSlotDocuments() {
      await loader.init();
      return Promise.all(
        parsed.map(async (entry) => ({
          locator: {
            slot: entry.slot,
            matches: contextFlatNodeToMatches(entry, options.contexts),
          },
          document: await readIndexedSlot(getIndexedSlot(entry.id)),
        }))
      );
    },
  });
}

export { parseSingleFile } from './parse-single-file';
export { buildSlotFilePath, validateSlotLocator } from './slot-path';
export { resolveWithinRoot } from './utils';
export { createFileSystemStore } from './store';
export * from './snapshot';
