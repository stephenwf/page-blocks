import {
  BlockWithOptionalSlotResponse,
  CreateSlot,
  JsonValue,
  normalizeSlotContext,
  normalizeSlotContextValue,
  normalizeSlotResponse,
  PageBlocksMutation,
  PageBlocksDirectoryContract,
  PageBlocksServiceRequest,
  PageBlocksServiceResponseMap,
  PageBlocksTarget,
  SlotDocument,
  SlotResponse,
  slotDocumentSchema,
} from '../core';
import { PageBlocksConflictError, PageBlocksNotFoundError, PageBlocksServiceError } from './errors';
import { PageBlocksStore, StoredPageBlocksDocument } from './types';

function cleanDocument(document: SlotDocument): SlotDocument {
  const parsed = slotDocumentSchema.parse(document);
  return {
    ...(parsed.name ? { name: parsed.name } : {}),
    blocks: JSON.parse(JSON.stringify(parsed.blocks)),
    ...(typeof parsed.options === 'undefined' ? {} : { options: JSON.parse(JSON.stringify(parsed.options)) }),
  };
}

function cloneDocument(document: SlotDocument): SlotDocument {
  return JSON.parse(JSON.stringify(cleanDocument(document)));
}

function rootSlot(record: StoredPageBlocksDocument) {
  return normalizeSlotResponse(record.id, record.locator.slot, {
    ...record.document,
    version: record.version,
  });
}

function resolveTargetSlot(document: SlotDocument, target: PageBlocksTarget) {
  let slot = document;
  for (const segment of target.path) {
    const block = slot.blocks.find((candidate) => candidate.id === segment.blockId);
    if (!block) {
      throw new PageBlocksNotFoundError(`Block "${segment.blockId}" was not found while resolving the nested target.`);
    }
    const nested = block.slots?.[segment.slot];
    if (!nested) {
      throw new PageBlocksNotFoundError(`Inner slot "${segment.slot}" was not found in block "${segment.blockId}".`);
    }
    slot = nested;
  }
  return slot;
}

function targetSlot(record: StoredPageBlocksDocument, target: PageBlocksTarget): SlotResponse {
  const slot = resolveTargetSlot(record.document, target);
  const name = target.path[target.path.length - 1]?.slot || record.locator.slot;
  return normalizeSlotResponse(target.path.length ? name : record.id, name, {
    ...slot,
    version: record.version,
  });
}

function resolvedTarget(record: StoredPageBlocksDocument, target: PageBlocksTarget) {
  return { document: record, target: targetSlot(record, target) };
}

function exactReorder(blocks: BlockWithOptionalSlotResponse[], blockIds: string[]) {
  const ids = blocks.map((block) => block.id);
  if (
    ids.length !== blockIds.length ||
    new Set(blockIds).size !== blockIds.length ||
    blockIds.some((id) => !ids.includes(id))
  ) {
    throw new PageBlocksConflictError('Block reorder must contain every current block id exactly once.');
  }
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return blockIds.map((id) => byId.get(id)!);
}

function requireBlock(slot: SlotDocument, blockId: string) {
  const index = slot.blocks.findIndex((block) => block.id === blockId);
  if (index === -1) {
    throw new PageBlocksNotFoundError(`Block "${blockId}" was not found.`);
  }
  return index;
}

function applyMutation(slot: SlotDocument, mutation: PageBlocksMutation) {
  let changed = true;
  let block: BlockWithOptionalSlotResponse | undefined;

  switch (mutation.type) {
    case 'replace-slot': {
      const replacement = cleanDocument(mutation.document);
      slot.blocks = replacement.blocks;
      slot.options = replacement.options;
      slot.name = replacement.name;
      break;
    }
    case 'create-block': {
      if (slot.blocks.some((candidate) => candidate.id === mutation.block.id)) {
        throw new PageBlocksConflictError(`Block id "${mutation.block.id}" already exists in this slot.`);
      }
      block = mutation.block;
      slot.blocks.push(block);
      break;
    }
    case 'update-block': {
      const index = requireBlock(slot, mutation.blockId);
      if (mutation.block.id !== mutation.blockId) {
        throw new PageBlocksConflictError('Updating a block cannot change its id.');
      }
      block = mutation.block;
      slot.blocks[index] = block;
      break;
    }
    case 'delete-block': {
      const index = requireBlock(slot, mutation.blockId);
      slot.blocks.splice(index, 1);
      break;
    }
    case 'reorder-blocks': {
      slot.blocks = exactReorder(slot.blocks, mutation.blockIds);
      break;
    }
    case 'update-block-props': {
      const index = requireBlock(slot, mutation.blockId);
      slot.blocks[index] = { ...slot.blocks[index], data: mutation.props as JsonValue };
      block = slot.blocks[index];
      break;
    }
    case 'update-slot-options': {
      slot.options = mutation.options;
      break;
    }
    case 'move-block-up':
    case 'move-block-down': {
      const index = requireBlock(slot, mutation.blockId);
      const nextIndex = mutation.type === 'move-block-up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= slot.blocks.length) {
        changed = false;
        break;
      }
      [slot.blocks[index], slot.blocks[nextIndex]] = [slot.blocks[nextIndex], slot.blocks[index]];
      break;
    }
    case 'create-inner-slot': {
      const index = requireBlock(slot, mutation.blockId);
      const parentBlock = slot.blocks[index];
      parentBlock.slots ||= {};
      if (parentBlock.slots[mutation.slot]) {
        throw new PageBlocksConflictError(
          `Inner slot "${mutation.slot}" already exists in block "${mutation.blockId}".`
        );
      }
      parentBlock.slots[mutation.slot] = cleanDocument(mutation.document || { blocks: [] });
      break;
    }
  }

  return { block, changed };
}

function locatorMatchesSearch(locator: CreateSlot, search: Record<string, string>) {
  const normalized = normalizeSlotContext(search);
  return locator.matches.every((match) => {
    if (!(match.id in normalized)) return true;
    if (match.type === 'exact') {
      return normalizeSlotContextValue(match.id, match.value) === normalized[match.id];
    }
    return match.type === 'all';
  });
}

export function createPageBlocksService(options: { store: PageBlocksStore; directory?: PageBlocksDirectoryContract }) {
  const store = options.store;

  const service = {
    store,
    async query(scope: string, context: Record<string, string>, slots?: string[]) {
      const records = await store.query(scope, context, slots);
      const responseSlots: Record<string, SlotResponse> = {};
      for (const record of records) {
        if (responseSlots[record.locator.slot]) {
          throw new PageBlocksConflictError(`Store returned more than one match for slot "${record.locator.slot}".`);
        }
        responseSlots[record.locator.slot] = rootSlot(record);
      }
      const slotNames = Object.keys(responseSlots).sort();
      return {
        slots: responseSlots,
        isEmpty: slotNames.length === 0,
        slotNames,
        context: normalizeSlotContext(context),
      };
    },

    async get(scope: string, target: PageBlocksTarget) {
      const record = await store.get(scope, target.documentId);
      if (!record) throw new PageBlocksNotFoundError(`Document "${target.documentId}" was not found.`);
      return resolvedTarget(record, target);
    },

    async create(scope: string, locator: CreateSlot, document: SlotDocument = { blocks: [] }) {
      const cleaned = cleanDocument(document);
      try {
        options.directory?.validateDocument(locator.slot, cleaned);
      } catch (error) {
        throw new PageBlocksServiceError(
          'invalid_request', error instanceof Error ? error.message : 'The document violates the directory policy.', 400
        );
      }
      const record = await store.create(scope, locator, cleaned);
      return resolvedTarget(record, { documentId: record.id, path: [] });
    },

    async mutate(
      scope: string,
      target: PageBlocksTarget,
      expectedVersion: number,
      mutation: PageBlocksMutation
    ) {
      const current = await store.get(scope, target.documentId);
      if (!current) throw new PageBlocksNotFoundError(`Document "${target.documentId}" was not found.`);
      if (current.version !== expectedVersion) {
        throw new PageBlocksConflictError(
          `Document "${target.documentId}" is at version ${current.version}, not ${expectedVersion}.`
        );
      }

      const document = cloneDocument(current.document);
      const slot = resolveTargetSlot(document, target);
      const result = applyMutation(slot, mutation);
      if (!result.changed) {
        return { ...resolvedTarget(current, target), block: result.block };
      }
      try {
        options.directory?.validateDocument(current.locator.slot, document);
      } catch (error) {
        throw new PageBlocksServiceError(
          'invalid_request', error instanceof Error ? error.message : 'The document violates the directory policy.', 400
        );
      }
      const saved = await store.save(scope, target.documentId, expectedVersion, document);
      return { ...resolvedTarget(saved, target), block: result.block };
    },

    async delete(scope: string, target: PageBlocksTarget, expectedVersion: number) {
      if (!target.path.length) {
        await store.delete(scope, target.documentId, expectedVersion);
        return { success: true as const, version: expectedVersion };
      }

      const current = await store.get(scope, target.documentId);
      if (!current) throw new PageBlocksNotFoundError(`Document "${target.documentId}" was not found.`);
      if (current.version !== expectedVersion) {
        throw new PageBlocksConflictError(
          `Document "${target.documentId}" is at version ${current.version}, not ${expectedVersion}.`
        );
      }
      const document = cloneDocument(current.document);
      const final = target.path[target.path.length - 1]!;
      const parent = resolveTargetSlot(document, { ...target, path: target.path.slice(0, -1) });
      const block = parent.blocks.find((candidate) => candidate.id === final.blockId);
      if (!block?.slots?.[final.slot]) {
        throw new PageBlocksNotFoundError(`Inner slot "${final.slot}" was not found in block "${final.blockId}".`);
      }
      delete block.slots[final.slot];
      const saved = await store.save(scope, target.documentId, expectedVersion, document);
      return { success: true as const, version: saved.version };
    },

    async contextValues(scope: string, contextId: string) {
      const values = new Set<string>();
      for (const record of await store.list(scope)) {
        for (const match of record.locator.matches) {
          if (match.id === contextId && match.type === 'exact') values.add(match.value);
        }
      }
      return [...values].sort();
    },

    async subContexts(scope: string, context: Record<string, string>) {
      const existing = new Set(Object.keys(context));
      const found = new Map<string, Record<string, string>>();
      for (const record of await store.list(scope)) {
        if (!locatorMatchesSearch(record.locator, context)) continue;
        const next: Record<string, string> = {};
        for (const match of record.locator.matches) {
          if (match.type === 'exact' && !existing.has(match.id)) next[match.id] = match.value;
        }
        if (Object.keys(next).length) found.set(JSON.stringify(next), next);
      }
      return [...found.values()].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    },

    async subContextBlocks(
      scope: string,
      context: Record<string, string>,
      query?: { searchValue?: string; slotIds?: string[]; blockTypes?: string[] }
    ) {
      const results = [];
      for (const subContext of await service.subContexts(scope, context)) {
        const fullContext = { ...context, ...subContext };
        const response = await service.query(scope, fullContext, query?.slotIds);
        const blocks = Object.values(response.slots).flatMap((slot) =>
          slot.blocks.filter((candidate) => {
            if (query?.blockTypes && !query.blockTypes.includes(candidate.type)) return false;
            return !query?.searchValue || JSON.stringify(candidate.data).toLowerCase().includes(query.searchValue.toLowerCase());
          })
        );
        results.push({ context: fullContext, blocks });
      }
      return results;
    },

    async dispatch(
      scope: string,
      request: PageBlocksServiceRequest
    ): Promise<PageBlocksServiceResponseMap[PageBlocksServiceRequest['type']]> {
      switch (request.type) {
        case 'query':
          return service.query(scope, request.context, request.slots);
        case 'get':
          return service.get(scope, request.target);
        case 'create':
          return service.create(scope, request.locator, request.document);
        case 'mutate':
          return service.mutate(scope, request.target, request.expectedVersion, request.mutation);
        case 'delete':
          return service.delete(scope, request.target, request.expectedVersion);
        case 'context-values':
          return service.contextValues(scope, request.context);
        case 'sub-contexts':
          return service.subContexts(scope, request.context);
        case 'sub-context-blocks':
          return service.subContextBlocks(scope, request.context, request.options);
      }
    },
  };

  return service;
}

export type PageBlocksService = ReturnType<typeof createPageBlocksService>;
