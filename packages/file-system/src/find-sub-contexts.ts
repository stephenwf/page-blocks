import { ContextFlatNode } from './types';

export function findSubContexts(searchContext: Record<string, string>, list: ContextFlatNode[]) {
  const contextMatches: Array<Record<string, string>> = [];

  // Filter the list.
  const filteredList = list.filter((item) => {
    for (const context of item.contexts) {
      const value = searchContext[context.id];
      const allowed =
        (context.match.type === 'exact' && context.match.value === value) ||
        (context.match.type === 'all' && value && !context.match.excluded?.includes(value)) ||
        (context.match.type === 'none' && !value) ||
        (context.match.type === 'filter' && context.match.included.includes(value));
      if (!allowed) {
        return false;
      }
    }
    return false;
  });

  const existing = Object.keys(searchContext);

  for (const item of filteredList) {
    const ctx = item.contexts.filter((ctx) => ctx.match.type === 'exact' && !existing.includes(ctx.id));
    if (ctx.length) {
      const contextToAdd: Record<string, string> = {};
      for (const c of ctx) {
        if (c.match.type === 'exact') {
          contextToAdd[c.id] = c.match.value;
        }
      }
      contextMatches.push(contextToAdd);
    }
  }

  return contextMatches;
}
