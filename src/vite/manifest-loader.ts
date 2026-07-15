import {
  type BlockWithOptionalSlotResponse,
  type FullSlotLoader,
  findSlotSubContexts,
  queryStaticManifest,
} from '../core';

function rejectMutation<T>() {
  return Promise.reject<T>(
    new Error('Page Blocks blueprints are read-only in runtime mode. Persist them with the sync API instead.')
  );
}

export function createManifestLoader(getManifest: () => {
  contexts: string[];
  entries: any[];
  slots: Record<string, any>;
}): FullSlotLoader {
  const querySubContext = async (searchContext: Record<string, string>) => {
    const manifest = getManifest();
    return findSlotSubContexts(manifest.contexts, searchContext, manifest.entries);
  };

  return {
    async init() {},
    async query(context: Record<string, string>, slotIds?: string[]) {
      return queryStaticManifest(getManifest(), context, slotIds);
    },
    async find(slotId: string) {
      const slot = getManifest().slots[slotId];
      if (!slot) {
        throw new Error(`Slot "${slotId}" was not found in the blueprint manifest.`);
      }

      return slot;
    },
    async update() {
      return rejectMutation<void>();
    },
    async delete() {
      return rejectMutation<void>();
    },
    async createSlot() {
      return rejectMutation<any>();
    },
    async findInnerSlot() {
      return rejectMutation<any>();
    },
    async createInnerSlot() {
      return rejectMutation<void>();
    },
    async deleteInnerSlot() {
      return rejectMutation<void>();
    },
    async updateInnerSlot() {
      return rejectMutation<void>();
    },
    async createBlock() {
      return rejectMutation<any>();
    },
    async deleteBlock() {
      return rejectMutation<void>();
    },
    async updateBlock() {
      return rejectMutation<void>();
    },
    async updateBlockProps() {
      return rejectMutation<void>();
    },
    async updateSlotOptions() {
      return rejectMutation<void>();
    },
    async reorderBlocks() {
      return rejectMutation<void>();
    },
    async moveBlockUp() {
      return rejectMutation<void>();
    },
    async moveBlockDown() {
      return rejectMutation<void>();
    },
    async queryContextValues(contextId: string) {
      const values = new Set<string>();

      for (const entry of getManifest().entries) {
        for (const context of entry.contexts) {
          if (context.id === contextId && context.match.type === 'exact') {
            values.add(context.match.value);
          }
        }
      }

      return [...values].sort((left, right) => left.localeCompare(right));
    },
    async querySubContext(context: Record<string, string>) {
      return querySubContext(context);
    },
    async querySubContextBlocks(
      context: Record<string, string>,
      query?: {
        searchValue?: string;
        slotIds?: string[];
        blockTypes?: string[];
      }
    ): Promise<Array<{ context: Record<string, string>; blocks: BlockWithOptionalSlotResponse[] }>> {
      const subContexts = await querySubContext(context);
      const allMatches: Array<{ context: Record<string, string>; blocks: BlockWithOptionalSlotResponse[] }> = [];

      for (const subContext of subContexts) {
        const fullContext = { ...context, ...subContext };
        const response = queryStaticManifest(getManifest(), fullContext, query?.slotIds);
        const blocks = Object.values(response.slots).flatMap((slot) =>
          slot.blocks.filter((block) => {
            if (query?.blockTypes && !query.blockTypes.includes(block.type)) {
              return false;
            }

            if (query?.searchValue) {
              return JSON.stringify(block.data).toLowerCase().includes(query.searchValue.toLowerCase());
            }

            return true;
          })
        );

        allMatches.push({ context: fullContext, blocks });
      }

      return allMatches;
    },
  };
}
