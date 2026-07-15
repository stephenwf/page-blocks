import { SlotQueryResponse, SlotResponse, slotResponseSchema } from './protocol';

export interface ContextFlatNode {
  id: string;
  slot: string;
  specificity: number;
  contexts: Array<{
    id: string;
    specificity: number;
    match: { type: 'exact'; value: string } | { type: 'all' } | { type: 'none' };
  }>;
}

export interface PageBlocksStaticManifest {
  contexts: string[];
  entries: ContextFlatNode[];
  slots: Record<string, SlotResponse>;
}

export function normalizeSlotPathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const value = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return value.endsWith('/') ? value.replace(/\/+$/, '') || '/' : value;
}

export function normalizeSlotContextValue(contextId: string, value: string | undefined) {
  if (typeof value === 'undefined') {
    return value;
  }

  return contextId === 'path' ? normalizeSlotPathname(value) : value;
}

export function normalizeSlotContext(contextValues: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(contextValues).map(([key, value]) => [key, normalizeSlotContextValue(key, value) ?? value])
  );
}

function contextOrder(contexts: string[], id: string) {
  const index = contexts.indexOf(id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function canonicalSlotLocatorKey(contexts: string[], node: Pick<ContextFlatNode, 'slot' | 'contexts'>) {
  const matches = [...node.contexts]
    .sort((left, right) => contextOrder(contexts, left.id) - contextOrder(contexts, right.id))
    .map((context) =>
      context.match.type === 'exact'
        ? [context.id, context.match.type, normalizeSlotContextValue(context.id, context.match.value)]
        : [context.id, context.match.type]
    );
  return JSON.stringify([node.slot, matches]);
}

function constraintsOverlap(
  left: ContextFlatNode['contexts'][number] | undefined,
  right: ContextFlatNode['contexts'][number] | undefined
) {
  if (!left || !right) {
    return true;
  }

  if (left.match.type === 'exact' && right.match.type === 'exact') {
    return (
      normalizeSlotContextValue(left.id, left.match.value) ===
      normalizeSlotContextValue(right.id, right.match.value)
    );
  }

  if (left.match.type === 'none' || right.match.type === 'none') {
    return left.match.type === right.match.type;
  }

  return true;
}

function locatorsOverlap(left: ContextFlatNode, right: ContextFlatNode) {
  const leftContexts = new Map(left.contexts.map((context) => [context.id, context]));
  const rightContexts = new Map(right.contexts.map((context) => [context.id, context]));
  const contextIds = new Set([...leftContexts.keys(), ...rightContexts.keys()]);

  for (const contextId of contextIds) {
    if (!constraintsOverlap(leftContexts.get(contextId), rightContexts.get(contextId))) {
      return false;
    }
  }

  return true;
}

export function validateSlotManifestEntries<Node extends ContextFlatNode>(
  contexts: string[],
  list: Node[],
  describe: (node: Node) => string = (node) => node.id
) {
  if (new Set(contexts).size !== contexts.length) {
    throw new Error('Page Blocks contexts must be unique.');
  }

  const keys = new Map<string, Node>();
  for (const item of list) {
    const seen = new Set<string>();
    for (const context of item.contexts) {
      if (!contexts.includes(context.id)) {
        throw new Error(`Unknown context "${context.id}" in ${describe(item)}.`);
      }
      if (seen.has(context.id)) {
        throw new Error(`Context "${context.id}" is repeated in ${describe(item)}.`);
      }
      seen.add(context.id);
    }

    const key = canonicalSlotLocatorKey(contexts, item);
    const duplicate = keys.get(key);
    if (duplicate) {
      throw new Error(`Duplicate slot locator for "${item.slot}": ${describe(duplicate)} and ${describe(item)}.`);
    }
    keys.set(key, item);
  }

  for (let leftIndex = 0; leftIndex < list.length; leftIndex += 1) {
    const left = list[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < list.length; rightIndex += 1) {
      const right = list[rightIndex];
      if (left.slot !== right.slot || left.specificity !== right.specificity || !locatorsOverlap(left, right)) {
        continue;
      }
      throw new Error(
        `Ambiguous slot locators for "${left.slot}" at specificity ${left.specificity}: ${describe(left)} and ${describe(right)}.`
      );
    }
  }
}

function matchesConstraint(context: ContextFlatNode['contexts'][number], values: Record<string, string>) {
  const hasValue = Object.prototype.hasOwnProperty.call(values, context.id);
  const value = values[context.id];

  if (context.match.type === 'exact') {
    return hasValue && normalizeSlotContextValue(context.id, context.match.value) === value;
  }
  if (context.match.type === 'all') {
    return hasValue;
  }
  return !hasValue;
}

export function findSlotManifestMatch<Node extends ContextFlatNode>(
  contexts: string[],
  contextValues: Record<string, string>,
  list: Node[],
  slotIds?: string[]
) {
  validateSlotManifestEntries(contexts, list);
  const normalizedContextValues = normalizeSlotContext(contextValues);
  const slotMatches = new Map<string, Node>();

  for (const item of [...list].sort((left, right) =>
    canonicalSlotLocatorKey(contexts, left).localeCompare(canonicalSlotLocatorKey(contexts, right))
  )) {
    if (!item.contexts.every((context) => matchesConstraint(context, normalizedContextValues))) {
      continue;
    }

    const existing = slotMatches.get(item.slot);
    if (!existing || existing.specificity < item.specificity) {
      slotMatches.set(item.slot, item);
      continue;
    }
    if (existing.specificity === item.specificity && existing.id !== item.id) {
      throw new Error(
        `Ambiguous slot match for "${item.slot}" at specificity ${item.specificity}: ${existing.id} and ${item.id}.`
      );
    }
  }

  const slotsToReturn: Record<string, Node> = {};
  const slotsToSearch = slotIds?.length ? slotIds : [...slotMatches.keys()].sort();
  for (const slotId of slotsToSearch) {
    const slot = slotMatches.get(slotId);
    if (slot) {
      slotsToReturn[slotId] = slot;
    }
  }

  return { context: normalizedContextValues, slots: slotsToReturn };
}

export function findSlotSubContexts<Node extends ContextFlatNode>(
  contexts: string[],
  searchContext: Record<string, string>,
  list: Node[]
) {
  const normalizedSearch = normalizeSlotContext(searchContext);
  const existing = new Set(Object.keys(normalizedSearch));
  const matches = new Map<string, Record<string, string>>();

  for (const item of list) {
    const matchesSearch = item.contexts.every((context) => {
      if (!existing.has(context.id)) {
        return true;
      }
      return matchesConstraint(context, normalizedSearch);
    });
    if (!matchesSearch) {
      continue;
    }

    const nextContext: Record<string, string> = {};
    for (const context of [...item.contexts].sort(
      (left, right) => contextOrder(contexts, left.id) - contextOrder(contexts, right.id)
    )) {
      if (!existing.has(context.id) && context.match.type === 'exact') {
        nextContext[context.id] = normalizeSlotContextValue(context.id, context.match.value) ?? context.match.value;
      }
    }

    if (Object.keys(nextContext).length) {
      matches.set(JSON.stringify(nextContext), nextContext);
    }
  }

  return [...matches.values()].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function normalizeSlotResponse(slotId: string, slotName: string, data: unknown): SlotResponse {
  const value = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const { slot_id: _legacySlotId, ...document } = value as Record<string, unknown>;
  return slotResponseSchema.parse({
    ...document,
    id: slotId,
    slot: slotName,
  });
}

export function queryStaticManifest(
  manifest: PageBlocksStaticManifest,
  context: Record<string, string>,
  slotIds?: string[]
): SlotQueryResponse {
  const matches = findSlotManifestMatch(manifest.contexts, context, manifest.entries, slotIds);
  const slots: Record<string, SlotResponse> = {};

  for (const [slotName, match] of Object.entries(matches.slots)) {
    const slot = manifest.slots[match.id];
    if (slot) {
      slots[slotName] = normalizeSlotResponse(match.id, match.slot, slot);
    }
  }

  const slotNames = Object.keys(slots);
  return {
    slots,
    isEmpty: slotNames.length === 0,
    slotNames,
    context: matches.context,
  };
}
