import { SlotApiRequest } from '@page-blocks/core';
import { ServerOptions } from './types';

export function createRequestHandler(options: ServerOptions<any>) {
  let init = false;
  const invalidateSlots = options.invalidateSlots;
  return async (body: SlotApiRequest): Promise<{ body: any; status: number }> => {
    const json = async (resp: any, status = 200) => {
      if (invalidateSlots && status < 300) {
        await invalidateSlots();
      }
      return { body: resp, status };
    };

    const { type } = body;
    if (!init) {
      await options.loader.init();
      init = true;
    }

    switch (type) {
      case 'request-slots': {
        const { slots, context } = body;
        const response = await options.loader.query(context, slots);
        return json(response);
      }
      case 'create-slot': {
        const { slot, matches } = body;
        const response = await options.loader.createSlot({ matches, slot });
        return json(response);
      }
      case 'create-inner-slot': {
        const { slotId, slot, parent } = body;
        const response = await options.loader.createInnerSlot(slotId, slot, parent);
        return json(response);
      }
      case 'update-slot': {
        const { slotId, data } = body;
        await options.loader.update(slotId, data);
        const response = { success: true };
        return json(response);
      }
      case 'update-inner-slot': {
        const { slotId, data, parent } = body;
        await options.loader.updateInnerSlot(slotId, data, parent);
        const response = { success: true };
        return json(response);
      }
      case 'delete-slot': {
        const { slotId, parent } = body;
        if (parent) {
          throw new Error('Cannot delete a slot with a parent');
        }
        await options.loader.delete(slotId);
        const response = { success: true };
        if (invalidateSlots) {
          console.log('INVALIDATING');
          await invalidateSlots();
        }
        return json(response);
      }
      case 'delete-inner-slot': {
        const { slotId, parent } = body;
        await options.loader.deleteInnerSlot(slotId, parent);
        const response = { success: true };
        return json(response);
      }
      case 'get-slot': {
        const { slotId } = body;
        const response = await options.loader.find(slotId);
        return json(response);
      }
      case 'create-block': {
        const { slotId, block, parent } = body;
        const response = await options.loader.createBlock(slotId, block, parent);
        return json(response);
      }
      case 'update-block': {
        const { slotId, blockId, block, parent } = body;
        await options.loader.updateBlock(slotId, blockId, block, parent);
        const response = { success: true };
        return json(response);
      }
      case 'delete-block': {
        const { slotId, blockId, parent } = body;
        await options.loader.deleteBlock(slotId, blockId, parent);
        const response = { success: true };
        return json(response);
      }
      case 'reorder-blocks': {
        const { slotId, blockIds, parent } = body;
        await options.loader.reorderBlocks(slotId, blockIds, parent);
        const response = { success: true };
        return json(response);
      }
      case 'update-slot-options': {
        const { slotId, options, parent } = body;
        await options.loader.updateSlotOptions(slotId, options, parent);
        const response = { success: true };
        return json(response);
      }
      case 'update-block-props': {
        const { slotId, blockId, props, parent } = body;
        await options.loader.updateBlockProps(slotId, blockId, props, parent);
        const response = { success: true };
        return json(response);
      }
      case 'move-block-up': {
        const { slotId, blockId, parent } = body;
        await options.loader.moveBlockUp(slotId, blockId, parent);
        const response = { success: true };
        return json(response);
      }
      case 'move-block-down': {
        const { slotId, blockId, parent } = body;
        await options.loader.moveBlockDown(slotId, blockId, parent);
        const response = { success: true };
        return json(response);
      }
      case 'query-context-values': {
        const { context } = body;
        const response = await options.loader.queryContextValues(context);
        return json(response);
      }
      case 'query-sub-context': {
        const { context } = body;
        const response = await options.loader.querySubContext(context);
        return json(response);
      }
      case 'query-sub-context-blocks': {
        const { context, options: queryOptions } = body;
        const response = await options.loader.querySubContextBlocks(context, queryOptions);
        return json(response);
      }
      case 'generate-screenshots': {
        if (options.generateScreenshots) {
          try {
            await options.generateScreenshots();
          } catch (err) {
            // Ignore + log.
            console.log(err);
          }
        }

        return json({ success: true });
      }
    }

    throw new Error(`Invalid request type ${type}`);
  };
}
