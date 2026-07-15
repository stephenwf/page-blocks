import {
  ContextFlatNode,
  contextNameSchema,
  CreateSlot,
  normalizeSlotContextValue,
  pageBlocksNameSchema,
  slotLocatorSchema,
} from '../core';

function validateContexts(contexts: string[]) {
  if (new Set(contexts).size !== contexts.length) {
    throw new Error('Page Blocks contexts must be unique.');
  }
  contexts.forEach((context) => contextNameSchema.parse(context));
}

function validateSlotName(slot: string) {
  pageBlocksNameSchema.parse(slot);
  if (slot === '.' || slot === '..' || /[\\/\0]/.test(slot)) {
    throw new Error(`Invalid slot name "${slot}".`);
  }
}

function encodeValueSegment(value: string) {
  if (value === '.' || value === '..' || value.includes('\0')) {
    throw new Error(`Invalid context path segment "${value}".`);
  }
  return encodeURIComponent(value);
}

export function validateSlotLocator(locator: CreateSlot, contexts: string[]) {
  slotLocatorSchema.parse(locator);
  validateContexts(contexts);
  validateSlotName(locator.slot);

  for (const match of locator.matches) {
    if (!contexts.includes(match.id)) {
      throw new Error(`Unknown context "${match.id}". Expected one of: ${contexts.join(', ')}.`);
    }
    if (match.type !== 'exact') {
      continue;
    }
    if (match.value.includes('\0') || match.value.includes('\\')) {
      throw new Error(`Invalid value for context "${match.id}".`);
    }
    if (match.id !== 'path' && (match.value.includes('/') || !match.value)) {
      throw new Error(`Context "${match.id}" requires one non-empty path segment.`);
    }
  }
}

function sortMatches(matches: CreateSlot['matches'], contexts: string[]) {
  return [...matches].sort((left, right) => contexts.indexOf(left.id) - contexts.indexOf(right.id));
}

function toMatchSegments(contextId: string, value: string) {
  const normalized = normalizeSlotContextValue(contextId, value) ?? value;
  const trimmed = contextId === 'path' ? normalized.replace(/^\/+|\/+$/g, '') : normalized;
  return trimmed ? trimmed.split('/').map(encodeValueSegment) : [];
}

export function buildSlotFilePath(slot: string, matches: CreateSlot['matches'], contexts: string[]) {
  validateSlotLocator({ slot, matches }, contexts);
  const parts: string[] = [];

  for (const match of sortMatches(matches, contexts)) {
    if (match.type === 'exact') {
      parts.push(`@${match.id}`);
      parts.push(...toMatchSegments(match.id, match.value));
    } else {
      parts.push(`@${match.id}:${match.type}`);
    }
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
    matches.push(
      context.match.type === 'exact'
        ? {
            id: context.id,
            type: 'exact',
            value: normalizeSlotContextValue(context.id, context.match.value) ?? context.match.value,
          }
        : { id: context.id, type: context.match.type }
    );
  }

  return matches;
}

export function blueprintLocatorKey(locator: { slot: string; matches: CreateSlot['matches'] }, contexts: string[]) {
  return buildSlotFilePath(locator.slot, locator.matches, contexts);
}
