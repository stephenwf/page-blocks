import { ContextFlatNode } from './types';

export function findMatch(
  contexts: string[],
  contextValues: Record<string, string>,
  list: ContextFlatNode[],
  slotIds?: string[]
) {
  const slotSpecificity: Record<string, number> = {};
  const slotMatches: Record<string, ContextFlatNode> = {};

  // Filter the list.
  const filteredList = list.filter((item) => {
    for (const context of item.contexts) {
      const value = contextValues[context.id];
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

  const slotsToReturn: Record<string, ContextFlatNode> = {};
  const slotsToSearch = slotIds || Object.keys(slotMatches);
  for (const slotId of slotsToSearch) {
    const slot = slotMatches[slotId];
    if (slot) {
      slotsToReturn[slotId] = slot;
    }
  }

  return {
    context: contextValues,
    slots: slotsToReturn,
  };
}
