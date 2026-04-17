import { readFile, unlink, writeFile } from 'fs/promises';
import { join, relative, resolve } from 'path';
import { mkdirp } from 'mkdirp';
import { existsSync } from 'fs';
import { base64ToText, readAllFiles, textToBase64 } from './utils';
import { loaderAdapter } from '@page-blocks/node';
import {
  BlockWithOptionalSlotResponse,
  CreateSlot,
  FullSlotLoader,
  SlotResponse,
  SlotSourceContextMatch,
  SlotSourceMetadata,
} from '@page-blocks/core';
import { ContextFlatNode } from './types';
import { parseSingleFile } from './parse-single-file';
import { findMatch } from './find-match';
import { findSubContexts } from './find-sub-contexts';

export function createFileSystemLoader(options: { path: string; contexts: string[] }): FullSlotLoader {
  // @todo use something to watch for changes, maybe as a "watch()" option on the FullSlotLoader.

  let parsed: ContextFlatNode[] = [];
  let fresh = false;
  const toAbsoluteFilePath = (filePath: string) => resolve(options.path, filePath);

  const sortByContextOrder = <T extends { id: string }>(values: T[]) => {
    return [...values].sort((left, right) => options.contexts.indexOf(left.id) - options.contexts.indexOf(right.id));
  };

  const toMatchedContexts = (
    entry?: ContextFlatNode | null,
    fallbackMatches?: CreateSlot['matches']
  ): SlotSourceContextMatch[] => {
    if (entry) {
      return sortByContextOrder(entry.contexts).map((context) => {
        if (context.match.type === 'exact') {
          return { id: context.id, type: 'exact', value: context.match.value };
        }
        if (context.match.type === 'filter') {
          return { id: context.id, type: 'filter', value: context.match.included.join(', ') };
        }
        return { id: context.id, type: context.match.type };
      });
    }

    if (!fallbackMatches) {
      return [];
    }

    return sortByContextOrder(fallbackMatches).map((match) => {
      if (match.type === 'exact') {
        return { id: match.id, type: 'exact', value: match.value };
      }
      return { id: match.id, type: match.type };
    });
  };

  const createSourceMetadata = (
    filePath: string,
    entry?: ContextFlatNode | null,
    fallbackMatches?: CreateSlot['matches']
  ): SlotSourceMetadata => ({
    filePath,
    matchedContexts: toMatchedContexts(entry, fallbackMatches),
  });

  const normalizeSlotResponse = (
    slotId: string,
    slotName: string,
    data: any,
    source?: SlotSourceMetadata
  ): SlotResponse => ({
    ...data,
    id: data.id || slotId,
    slot: data.slot || data.name || slotName,
    source,
  });

  const stripSlotSource = (data: any) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const { source, ...persisted } = data;
    return persisted;
  };

  return loaderAdapter({
    async init(force = false) {
      await mkdirp(options.path);

      if (!force && !fresh) {
        const files = Array.from(readAllFiles(options.path));
        parsed = [];
        for await (const file of files) {
          if (!file.endsWith('.json')) {
            continue;
          }
          const relativePath = relative(options.path, file as string);
          const single = parseSingleFile(relativePath as string, options.contexts);
          if (single) {
            parsed.push(single);
          }
        }

        fresh = true;
      }
    },
    async query(context: Record<string, string>, slotIds?: string[]) {
      if (!fresh) {
        await this.init();
      }
      const matches = findMatch(options.contexts, context, parsed, slotIds);
      const keys = Object.keys(matches.slots);
      const slots: Record<string, any> = {};
      const slotNames: string[] = [];
      for (const key of keys) {
        const matchedSlot = matches.slots[key];
        const hash = matchedSlot.id;
        const fileName = base64ToText(hash);
        const absoluteFilePath = toAbsoluteFilePath(fileName);
        const data = await readFile(absoluteFilePath, { flag: 'rs', encoding: 'utf8' });
        const json = JSON.parse(data);
        slots[key] = normalizeSlotResponse(hash, matchedSlot.slot, json, createSourceMetadata(absoluteFilePath, matchedSlot));
        slotNames.push(key);
      }
      return { slots, isEmpty: slotNames.length === 0, slotNames, context } as any;
    },
    async find(slotId: string) {
      if (!fresh) {
        await this.init();
      }
      const fileName = base64ToText(slotId);
      const absoluteFilePath = toAbsoluteFilePath(fileName);
      const data = await readFile(absoluteFilePath, 'utf8');
      const json = JSON.parse(data);
      const matchedSlot = parsed.find((entry) => entry.id === slotId) || parseSingleFile(fileName, options.contexts);
      return normalizeSlotResponse(
        slotId,
        matchedSlot?.slot || json.slot || json.name || slotId,
        json,
        createSourceMetadata(absoluteFilePath, matchedSlot)
      );
    },
    async update(slotId: string, data: any) {
      if (!fresh) {
        await this.init();
      }
      const fileName = base64ToText(slotId);
      await writeFile(toAbsoluteFilePath(fileName), JSON.stringify(stripSlotSource(data), null, 2));

      await this.init(true);
    },
    async createSlot(request: CreateSlot) {
      const { matches, slot } = request;
      const parts: string[] = [];
      for (const match of matches) {
        if (match.type === 'exact') {
          parts.push(`@${match.id}/${match.value}`);
        }
        if (match.type === 'all') {
          parts.push(`@${match.id}:all`);
        }
        if (match.type === 'none') {
          parts.push(`@${match.id}:none`);
        }
      }

      await mkdirp(join(options.path, ...parts));

      parts.push(`${slot}.json`);

      const pathToFile = join(...parts);

      const data = {
        // @todo make this customisable?
        // id: btoa(pathToFile),
        name: slot,
        blocks: [],
      };

      const resolved = join(options.path, pathToFile);

      await writeFile(resolved, JSON.stringify(data, null, 2));

      const parsedSingle = parseSingleFile(relative(options.path, resolved), options.contexts);
      if (parsedSingle) {
        parsed.push(parsedSingle);
      }

      fresh = false;

      return normalizeSlotResponse(
        textToBase64(pathToFile),
        slot,
        data,
        createSourceMetadata(resolve(resolved), parsedSingle, matches)
      );
    },
    async delete(slotId: string) {
      if (!fresh) {
        await this.init();
      }
      const fileName = base64ToText(slotId);
      if (fileName.includes('..') || !fileName.endsWith('.json')) {
        throw new Error('Invalid slotId');
      }

      parsed = parsed.filter((item) => item.id !== slotId);

      const fullPath = join(options.path, fileName);
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }

      await this.init(true);
    },
    async queryContextValues(context: string) {
      if (!fresh) {
        await this.init();
      }
      const foundValues: string[] = [];
      for (const item of parsed) {
        for (const ctx of item.contexts) {
          if (ctx.id === context && ctx.match.type === 'exact') {
            if (!foundValues.includes(ctx.match.value)) {
              foundValues.push(ctx.match.value);
            }
          }
        }
      }
      return foundValues;
    },
    async querySubContext(context: Record<string, string>): Promise<Array<Record<string, string>>> {
      if (!fresh) {
        await this.init();
      }

      return findSubContexts(context, parsed);
    },
    async querySubContextBlocks(
      context: Record<string, string>,
      query?: {
        searchValue?: string;
        slotIds?: string[];
        blockTypes?: string[];
      }
    ): Promise<Array<{ context: Record<string, string>; blocks: BlockWithOptionalSlotResponse[] }>> {
      if (!fresh) {
        await this.init();
      }

      const allMatches = [];

      const foundSubContexts = findSubContexts(context, parsed);
      for (const subContext of foundSubContexts) {
        const fullContext = { ...context, ...subContext };
        const matches = findMatch(options.contexts, context, parsed, query?.slotIds);
        if (matches) {
          const slotIds = Object.keys(matches.slots);
          const foundBlocks = [];
          for (const slotId of slotIds) {
            const hash = matches.slots[slotId].id;
            const fileName = base64ToText(hash);
            const data = await readFile(join(options.path, fileName), { flag: 'rs', encoding: 'utf8' });
            const json = JSON.parse(data);

            const blocks = json.blocks.filter((block: any) => {
              if (query?.blockTypes && !query.blockTypes.includes(block.type)) {
                return false;
              }
              if (query?.searchValue) {
                // @todo search value filtering.
              }
              return true;
            });

            foundBlocks.push(...blocks);
          }

          allMatches.push({ context: fullContext, blocks: foundBlocks });
        }
      }

      return allMatches;
    },
  });
}
