import { SlotQueryResponse, SlotResponse } from './protocol';

export interface ContextFlatNode {
  id: string;
  slot: string;
  specificity: number;
  contexts: Array<{
    id: string;
    specificity: number;
    match:
      | {
          type: 'exact';
          value: string;
        }
      | {
          type: 'all';
          excluded?: string[];
        }
      | {
          type: 'none';
        }
      | {
          type: 'filter';
          included: string[];
        };
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
  return value.endsWith('/') && value !== '/' ? value.slice(0, -1) : value;
}

export function normalizeSlotContextValue(contextId: string, value: string | undefined) {
  if (typeof value === 'undefined') {
    return value;
  }

  if (contextId === 'path') {
    return normalizeSlotPathname(value);
  }

  return value;
}

export function normalizeSlotContext(contextValues: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(contextValues).map(([key, value]) => [key, normalizeSlotContextValue(key, value) || value])
  );
}

export function findSlotManifestMatch<Node extends ContextFlatNode>(
  contexts: string[],
  contextValues: Record<string, string>,
  list: Node[],
  slotIds?: string[]
) {
  const normalizedContextValues = normalizeSlotContext(contextValues);
  const slotSpecificity: Record<string, number> = {};
  const slotMatches: Record<string, Node> = {};

  const filteredList = list.filter((item) => {
    for (const context of item.contexts) {
      const value = normalizedContextValues[context.id];
      const allowed =
        (context.match.type === 'exact' && context.match.value === value) ||
        (context.match.type === 'all' && value && !context.match.excluded?.includes(value)) ||
        (context.match.type === 'none' && !value) ||
        (context.match.type === 'filter' && context.match.included.includes(value));

      if (!allowed) {
        return false;
      }
    }

    return true;
  });

  for (const item of filteredList) {
    const existingSpecificity = slotSpecificity[item.slot];
    if (typeof existingSpecificity !== 'undefined' && existingSpecificity > item.specificity) {
      continue;
    }

    slotSpecificity[item.slot] = item.specificity;
    slotMatches[item.slot] = item;
  }

  const slotsToReturn: Record<string, Node> = {};
  const slotsToSearch = slotIds?.length ? slotIds : Object.keys(slotMatches);
  for (const slotId of slotsToSearch) {
    const slot = slotMatches[slotId];
    if (slot) {
      slotsToReturn[slotId] = slot;
    }
  }

  return {
    context: normalizedContextValues,
    slots: slotsToReturn,
  };
}

export function normalizeSlotResponse(slotId: string, slotName: string, data: any): SlotResponse {
  return {
    ...data,
    id: data.id || slotId,
    slot: data.slot || data.name || slotName,
  };
}

export function queryStaticManifest(
  manifest: PageBlocksStaticManifest,
  context: Record<string, string>,
  slotIds?: string[]
): SlotQueryResponse {
  const matches = findSlotManifestMatch(manifest.contexts, context, manifest.entries, slotIds);
  const keys = Object.keys(matches.slots);
  const slots: Record<string, SlotResponse> = {};
  const slotNames: string[] = [];

  for (const key of keys) {
    const match = matches.slots[key];
    const slot = manifest.slots[match.id];

    if (!slot) {
      continue;
    }

    slots[key] = normalizeSlotResponse(match.id, match.slot, slot);
    slotNames.push(key);
  }

  return {
    slots,
    isEmpty: slotNames.length === 0,
    slotNames,
    context: matches.context,
  };
}
