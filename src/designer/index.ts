import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isValidElement, type FC, type ReactElement } from 'react';
import { type CreateSlot, type PageBlocksStaticManifest, type SlotResponse } from '../core';
import { parseSingleFile } from '../file-system/parse-single-file';
import { blueprintLocatorKey, buildSlotFilePath } from '../file-system/slot-path';

const blueprintSymbol = Symbol.for('@page-blocks/blueprint');

type AnyDirectory = {
  Blocks: Record<string, FC<any>>;
  metadata: Record<string, { mapFromProps?: (props: any) => any }>;
};
type BlueprintPatterns = string | string[];
type BlueprintMatchValue = string | '@all' | '@none';

export type BlueprintMatch = Record<string, BlueprintMatchValue>;

type DesignBlocks<BlockMap extends Record<string, FC<any>>> = {
  [Key in keyof BlockMap]: BlockMap[Key] extends FC<infer Props> ? FC<Props & { id: string }> : never;
};

export interface BlueprintDefinition<D extends AnyDirectory = AnyDirectory> {
  [blueprintSymbol]: true;
  directory: D;
  name: string;
  run: (options: {
    Blocks: DesignBlocks<D['Blocks']>;
    slots: {
      add: (slotName: string, match: BlueprintMatch, element: ReactElement) => void;
    };
  }) => void | Promise<void>;
}

export interface CompiledBlueprintSlot {
  slot: string;
  matches: CreateSlot['matches'];
  data: SlotResponse;
}

export interface CompiledBlueprintSet<D extends AnyDirectory = AnyDirectory> {
  directory: D;
  contexts: string[];
  manifest: PageBlocksStaticManifest;
  slots: CompiledBlueprintSlot[];
}

export interface BlueprintSyncAdapter {
  upsertBlueprintSlot(request: CreateSlot & { data: SlotResponse }): Promise<void>;
  deleteBlueprintSlot?(request: CreateSlot): Promise<void>;
  listBlueprintSlots?(): Promise<Array<{ slot: string; matches: CreateSlot['matches'] }>>;
}

function hasNestedReactValue(value: unknown): boolean {
  if (isValidElement(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasNestedReactValue(entry));
  }

  return false;
}

function toCreateSlotMatches(match: BlueprintMatch, contexts: string[]): CreateSlot['matches'] {
  const matches: CreateSlot['matches'] = [];

  for (const contextId of Object.keys(match)) {
    if (!contexts.includes(contextId)) {
      throw new Error(`Unknown blueprint context "${contextId}". Expected one of: ${contexts.join(', ')}`);
    }
  }

  for (const contextId of contexts) {
    if (!(contextId in match)) {
      continue;
    }

    const value = match[contextId];
    if (value === '@all') {
      matches.push({ id: contextId, type: 'all' });
      continue;
    }

    if (value === '@none') {
      matches.push({ id: contextId, type: 'none' });
      continue;
    }

    matches.push({
      id: contextId,
      type: 'exact',
      value,
    });
  }

  return matches;
}

function isBlueprintDefinition(value: unknown): value is BlueprintDefinition {
  return Boolean(value && typeof value === 'object' && blueprintSymbol in value);
}

function findBlueprints(modules: Array<Record<string, unknown>>) {
  const blueprints: BlueprintDefinition[] = [];

  for (const loadedModule of modules) {
    for (const value of Object.values(loadedModule)) {
      if (isBlueprintDefinition(value)) {
        blueprints.push(value);
      }
    }
  }

  return blueprints;
}

function resolveBlockType(directory: AnyDirectory, elementType: unknown) {
  for (const [type, component] of Object.entries(directory.Blocks)) {
    if (component === elementType) {
      return type;
    }
  }

  return null;
}

function getSerializedSlotBlock(
  directory: AnyDirectory,
  slotName: string,
  element: ReactElement
) {
  const blockType = resolveBlockType(directory, element.type);
  if (!blockType) {
    throw new Error(`Blueprint slot "${slotName}" uses a component that is not registered in the directory.`);
  }

  const props = { ...(element.props as Record<string, unknown>) };
  const id = props.id;
  if (typeof id !== 'string' || !id) {
    throw new Error(`Blueprint block in slot "${slotName}" is missing a string id.`);
  }

  if ('children' in props && props.children != null) {
    throw new Error(`Blueprint block "${id}" in slot "${slotName}" cannot define children in v1.`);
  }

  delete props.id;
  delete props.children;

  for (const [propName, value] of Object.entries(props)) {
    if (hasNestedReactValue(value)) {
      throw new Error(
        `Blueprint block "${id}" in slot "${slotName}" contains nested React content in prop "${propName}", which is not supported in v1.`
      );
    }
  }

  const config = directory.metadata[blockType];

  return {
    id,
    type: blockType,
    data: config?.mapFromProps ? config.mapFromProps(props as never) : props,
  };
}

export function designer<D extends AnyDirectory>(directory: D) {
  return {
    design(name: string, run: BlueprintDefinition<D>['run']): BlueprintDefinition<D> {
      return {
        [blueprintSymbol]: true,
        directory,
        name,
        run,
      };
    },
  };
}

export async function compileBlueprintModules<D extends AnyDirectory = AnyDirectory>(options: {
  modules: Array<Record<string, unknown>>;
  contexts: string[];
}): Promise<CompiledBlueprintSet<D>> {
  const blueprints = findBlueprints(options.modules);
  if (!blueprints.length) {
    throw new Error('No blueprint definitions were found in the loaded modules.');
  }

  const directory = blueprints[0].directory as D;
  for (const blueprint of blueprints) {
    if (blueprint.directory !== directory) {
      throw new Error('All blueprints in a compilation run must use the same page-blocks directory.');
    }
  }

  const slotMap = new Map<string, CompiledBlueprintSlot>();

  for (const blueprint of blueprints) {
    await blueprint.run({
      Blocks: blueprint.directory.Blocks as DesignBlocks<D['Blocks']>,
      slots: {
        add: (slotName, match, element) => {
          if (!isValidElement(element)) {
            throw new Error(`Blueprint "${blueprint.name}" attempted to add a non-element to slot "${slotName}".`);
          }

          const matches = toCreateSlotMatches(match, options.contexts);
          const relativePath = buildSlotFilePath(slotName, matches, options.contexts);
          const parsed = parseSingleFile(relativePath, options.contexts);
          if (!parsed) {
            throw new Error(`Blueprint "${blueprint.name}" produced an invalid slot path for "${slotName}".`);
          }

          const key = blueprintLocatorKey({ slot: slotName, matches }, options.contexts);
          const block = getSerializedSlotBlock(directory, slotName, element);
          const existing = slotMap.get(key);

          if (!existing) {
            slotMap.set(key, {
              slot: slotName,
              matches,
              data: {
                id: parsed.id,
                slot: slotName,
                blocks: [block],
              },
            });
            return;
          }

          if (existing.data.blocks.some((existingBlock) => existingBlock.id === block.id)) {
            throw new Error(
              `Blueprint "${blueprint.name}" attempted to add duplicate block id "${block.id}" in slot "${slotName}".`
            );
          }

          existing.data.blocks.push(block);
        },
      },
    });
  }

  const slots = [...slotMap.values()].sort((left, right) =>
    buildSlotFilePath(left.slot, left.matches, options.contexts).localeCompare(
      buildSlotFilePath(right.slot, right.matches, options.contexts)
    )
  );

  const entries = slots.map((slot) => {
    const relativePath = buildSlotFilePath(slot.slot, slot.matches, options.contexts);
    const parsed = parseSingleFile(relativePath, options.contexts);
    if (!parsed) {
      throw new Error(`Failed to build a manifest entry for blueprint slot "${slot.slot}".`);
    }
    return parsed;
  });

  return {
    directory,
    contexts: options.contexts,
    slots,
    manifest: {
      contexts: options.contexts,
      entries,
      slots: Object.fromEntries(slots.map((slot) => [slot.data.id, slot.data])),
    },
  };
}

function hasGlob(pattern: string) {
  return pattern.includes('*');
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/');
}

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function patternToRegex(pattern: string) {
  const normalized = normalizePath(pattern);
  let output = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    const afterNext = normalized[index + 2];

    if (char === '*' && next === '*') {
      if (afterNext === '/') {
        output += '(?:.*/)?';
        index += 2;
        continue;
      }

      output += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      output += '[^/]*';
      continue;
    }

    output += escapeRegex(char);
  }

  output += '$';
  return new RegExp(output);
}

async function readFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readFilesRecursive(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

export async function resolveBlueprintFiles(options: { root: string; designs: BlueprintPatterns }) {
  const patterns = (Array.isArray(options.designs) ? options.designs : [options.designs]).map((pattern) =>
    normalizePath(pattern)
  );
  const discovered = new Set<string>();

  for (const pattern of patterns) {
    if (!hasGlob(pattern)) {
      const resolvedPath = resolve(options.root, pattern);
      if (existsSync(resolvedPath)) {
        discovered.add(resolvedPath);
      }
      continue;
    }

    const regex = patternToRegex(pattern);
    const files = await readFilesRecursive(options.root);

    for (const file of files) {
      const relativePath = normalizePath(relative(options.root, file));
      if (regex.test(relativePath)) {
        discovered.add(file);
      }
    }
  }

  return [...discovered].sort((left, right) => left.localeCompare(right));
}

export async function compileBlueprintFiles<D extends AnyDirectory = AnyDirectory>(options: {
  root: string;
  designs: BlueprintPatterns;
  contexts: string[];
  loadModule?: (file: string) => Promise<Record<string, unknown>>;
}): Promise<CompiledBlueprintSet<D>> {
  const files = await resolveBlueprintFiles({
    root: options.root,
    designs: options.designs,
  });

  if (!files.length) {
    throw new Error('No blueprint files matched the configured design patterns.');
  }

  const loadModule =
    options.loadModule ||
    (async (file: string) => {
      return import(/* @vite-ignore */ pathToFileURL(file).href);
    });

  const modules = await Promise.all(files.map((file) => loadModule(file)));
  return compileBlueprintModules<D>({
    modules,
    contexts: options.contexts,
  });
}

export async function syncBlueprintFiles<D extends AnyDirectory = AnyDirectory>(options: {
  root: string;
  designs: BlueprintPatterns;
  contexts: string[];
  loader: BlueprintSyncAdapter;
  loadModule?: (file: string) => Promise<Record<string, unknown>>;
}): Promise<CompiledBlueprintSet<D>> {
  const compiled = await compileBlueprintFiles<D>(options);
  const targetKeys = new Set(compiled.slots.map((slot) => blueprintLocatorKey(slot, compiled.contexts)));

  if (options.loader.listBlueprintSlots && options.loader.deleteBlueprintSlot) {
    const existing = await options.loader.listBlueprintSlots();
    for (const slot of existing) {
      const key = blueprintLocatorKey(slot, compiled.contexts);
      if (!targetKeys.has(key)) {
        await options.loader.deleteBlueprintSlot({
          slot: slot.slot,
          matches: slot.matches,
        });
      }
    }
  }

  for (const slot of compiled.slots) {
    await options.loader.upsertBlueprintSlot({
      slot: slot.slot,
      matches: slot.matches,
      data: slot.data,
    });
  }

  return compiled;
}
