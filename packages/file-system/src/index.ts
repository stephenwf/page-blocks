import { readFile, unlink, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { mkdirp } from 'mkdirp';
import { existsSync } from 'fs';
import { base64ToText, readAllFiles } from './utils';
import { loaderAdapter } from '@page-blocks/node';
import { BlockWithOptionalSlotResponse, CreateSlot, FullSlotLoader } from '@page-blocks/core';
import { ContextFlatNode } from './types';
import { parseSingleFile } from './parse-single-file';
import { findMatch } from './find-match';
import { findSubContexts } from './find-sub-contexts';

export function createFileSystemLoader(options: { path: string; contexts: string[] }): FullSlotLoader {
  // @todo use something to watch for changes, maybe as a "watch()" option on the FullSlotLoader.

  let parsed: ContextFlatNode[] = [];
  let fresh = false;

  return loaderAdapter({
    async init(force = false) {
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
        const hash = matches.slots[key].id;
        const fileName = base64ToText(hash);
        if (existsSync(join(options.path, fileName))) {
          const data = await readFile(join(options.path, fileName), { flag: 'rs', encoding: 'utf8' });
          const json = JSON.parse(data);
          json.id = json.id || hash;
          slots[key] = json;
          slotNames.push(key);
        }
      }
      return { slots, isEmpty: slotNames.length === 0, slotNames, context } as any;
    },
    async find(slotId: string) {
      if (!fresh) {
        await this.init();
      }
      const fileName = base64ToText(slotId);
      const data = await readFile(join(options.path, fileName), 'utf8');
      return JSON.parse(data);
    },
    async update(slotId: string, data: any) {
      if (!fresh) {
        await this.init();
      }
      const fileName = base64ToText(slotId);
      await writeFile(join(options.path, fileName), JSON.stringify(data, null, 2));

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

      return data as any;
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
