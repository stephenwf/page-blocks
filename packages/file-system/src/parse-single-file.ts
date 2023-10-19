import { ContextFlatNode } from './types';
import { modifiers, types } from './constants';
import { textToBase64 } from './utils';

export function parseSingleFile(path: string, contexts: string[]): ContextFlatNode | null {
  const foundContexts: ContextFlatNode['contexts'] = [];
  const allParts = path.split('/');
  const fileName = allParts.pop()!;
  const parts = allParts;
  let currentContextSpecificityPower = 0;
  let currentContext = '';
  let currentContextValueParts: string[] = [];
  let modifierType = 'exact';
  const close = () => {
    if (currentContext) {
      let match: ContextFlatNode['contexts'][0]['match'] = { type: 'all' };

      if (modifierType === 'exact') {
        match = {
          type: 'exact',
          value: currentContextValueParts.join('/'),
        };
      }
      if (modifierType === 'none') {
        match = {
          type: 'none',
        };
      }

      // Need to close the current context.
      foundContexts.push({
        id: currentContext,
        specificity: (9 - types.indexOf(modifierType || 'all')) * Math.pow(10, currentContextSpecificityPower),
        match,
      });
      modifierType = 'all';
      currentContextValueParts = [];
    }
  };

  for (const part of parts) {
    if (part.startsWith('@')) {
      close();

      // This is a context.
      const [atName, modifier] = part.split(':');
      const name = atName.slice(1);
      currentContextSpecificityPower = contexts.indexOf(name);
      if (!modifiers.includes(modifier)) {
        modifierType = 'exact';
        if (modifier) {
          currentContextValueParts.push(modifier);
        }
      } else {
        modifierType = modifier;
      }
      if (currentContextSpecificityPower === -1) {
        // throw new Error(`Unknown context ${name}`);
        return null;
      }

      currentContext = name;
    } else {
      if (part) {
        // This is a value.
        currentContextValueParts.push(part);
      }
    }
  }
  // Close the last part.
  close();

  // The last piece should be the file itself.
  const [slotId, ...slotParts] = fileName.split('.');
  const format = slotParts.pop();
  if (!format) {
    return null;
  }
  let specificity = 0;
  for (const context of foundContexts) {
    specificity += context.specificity;
  }
  return {
    id: textToBase64(path),
    slot: slotId,
    specificity,
    contexts: foundContexts,
  };
}
