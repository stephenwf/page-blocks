import { createHash } from 'node:crypto';
import { ContextFlatNode, contextNameSchema, normalizeSlotContextValue, pageBlocksNameSchema } from '../core';
import { modifiers, types } from './constants';

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Invalid encoded Page Blocks path segment "${value}".`);
  }
}

function opaqueDocumentId(path: string) {
  return createHash('sha256').update(path).digest('base64url');
}

export function parseSingleFile(filePath: string, contexts: string[]): ContextFlatNode | null {
  const normalizedPath = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalizedPath.startsWith('/') || normalizedPath.split('/').some((part) => part === '..')) {
    throw new Error(`Slot file path must stay relative: "${filePath}".`);
  }

  const allParts = normalizedPath.split('/');
  const fileName = allParts.pop();
  if (!fileName?.endsWith('.json')) {
    return null;
  }

  const slot = fileName.slice(0, -'.json'.length);
  pageBlocksNameSchema.parse(slot);
  if (slot === '.' || slot === '..' || /[\\/\0]/.test(slot)) {
    throw new Error(`Invalid slot name "${slot}" in "${filePath}".`);
  }

  const foundContexts: ContextFlatNode['contexts'] = [];
  let currentContext = '';
  let currentContextSpecificityPower = 0;
  let currentContextValueParts: string[] = [];
  let modifierType: (typeof types)[number] = 'exact';

  const close = () => {
    if (!currentContext) {
      return;
    }

    let match: ContextFlatNode['contexts'][number]['match'];
    if (modifierType === 'exact') {
      const rawValue = currentContextValueParts.map(decodeSegment).join('/');
      if (!rawValue && currentContext !== 'path') {
        throw new Error(`Context "${currentContext}" has an empty exact value in "${filePath}".`);
      }
      match = {
        type: 'exact',
        value: normalizeSlotContextValue(currentContext, rawValue) ?? rawValue,
      };
    } else {
      match = { type: modifierType };
    }

    foundContexts.push({
      id: currentContext,
      specificity: (9 - types.indexOf(modifierType)) * Math.pow(10, currentContextSpecificityPower),
      match,
    });
    currentContext = '';
    modifierType = 'exact';
    currentContextValueParts = [];
  };

  for (const part of allParts) {
    if (part.startsWith('@')) {
      close();
      const [atName, modifier, ...rest] = part.split(':');
      if (rest.length || (modifier && !modifiers.includes(modifier as (typeof modifiers)[number]))) {
        throw new Error(`Unknown context modifier in "${part}".`);
      }

      const name = atName.slice(1);
      contextNameSchema.parse(name);
      currentContextSpecificityPower = contexts.indexOf(name);
      if (currentContextSpecificityPower === -1) {
        throw new Error(`Unknown context "${name}" in "${filePath}".`);
      }
      if (foundContexts.some((context) => context.id === name)) {
        throw new Error(`Context "${name}" is repeated in "${filePath}".`);
      }

      currentContext = name;
      modifierType = (modifier || 'exact') as (typeof types)[number];
      continue;
    }

    if (!currentContext) {
      throw new Error(`Context value "${part}" has no context in "${filePath}".`);
    }
    currentContextValueParts.push(part);
  }
  close();

  const specificity = foundContexts.reduce((total, context) => total + context.specificity, 0);
  return {
    id: opaqueDocumentId(normalizedPath),
    slot,
    specificity,
    contexts: foundContexts,
  };
}
