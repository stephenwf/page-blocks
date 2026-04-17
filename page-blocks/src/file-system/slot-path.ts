import { ContextFlatNode, CreateSlot, normalizeSlotContextValue } from '../core';

function sortMatches(matches: CreateSlot['matches'], contexts: string[]) {
  return [...matches].sort((left, right) => contexts.indexOf(left.id) - contexts.indexOf(right.id));
}

function toMatchSegments(contextId: string, value: string) {
  const normalized = normalizeSlotContextValue(contextId, value) || value;
  const trimmed = contextId === 'path' ? normalized.replace(/^\/+/, '') : normalized;

  if (!trimmed) {
    return [];
  }

  return trimmed.split('/').filter(Boolean);
}

export function buildSlotFilePath(slot: string, matches: CreateSlot['matches'], contexts: string[]) {
  const parts: string[] = [];

  for (const match of sortMatches(matches, contexts)) {
    if (match.type === 'exact') {
      parts.push(`@${match.id}`);
      parts.push(...toMatchSegments(match.id, match.value));
      continue;
    }

    parts.push(`@${match.id}:${match.type}`);
  }

  parts.push(`${slot}.json`);
  return parts.join('/');
}

export function contextFlatNodeToMatches(node: ContextFlatNode, contexts: string[]): CreateSlot['matches'] {
  const contextMap = new Map(node.contexts.map((context) => [context.id, context]));
  const matches: CreateSlot['matches'] = [];

  for (const contextId of contexts) {
    const context = contextMap.get(contextId);
    if (!context) {
      continue;
    }

    if (context.match.type === 'exact') {
      matches.push({
        id: context.id,
        type: 'exact',
        value: normalizeSlotContextValue(context.id, context.match.value) || context.match.value,
      });
      continue;
    }

    if (context.match.type === 'all' || context.match.type === 'none') {
      matches.push({
        id: context.id,
        type: context.match.type,
      });
    }
  }

  return matches;
}

export function blueprintLocatorKey(
  locator: {
    slot: string;
    matches: CreateSlot['matches'];
  },
  contexts: string[]
) {
  return buildSlotFilePath(locator.slot, locator.matches, contexts);
}
