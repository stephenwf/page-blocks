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

    if (type === 'request-slots') {
      const { slots, context } = body;
      const response = await options.loader.query(context, slots);
      return json(response);
    }
    if (type === 'create-slot') {
      const { slot, matches } = body;
      const response = await options.loader.createSlot({ matches, slot });
      return json(response);
    }
    if (type === 'create-inner-slot') {
      const { slotId, slot, parent } = body;
      const response = await options.loader.createInnerSlot(slotId, slot, parent);
      return json(response);
    }
    if (type === 'update-slot') {
      const { slotId, data } = body;
      await options.loader.update(slotId, data);
      const response = { success: true };
      return json(response);
    }
    if (type === 'update-inner-slot') {
      const { slotId, data, parent } = body;
      await options.loader.updateInnerSlot(slotId, data, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'delete-slot') {
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
    if (type === 'delete-inner-slot') {
      const { slotId, parent } = body;
      await options.loader.deleteInnerSlot(slotId, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'get-slot') {
      const { slotId } = body;
      const response = await options.loader.find(slotId);
      return json(response);
    }
    if (type === 'create-block') {
      const { slotId, block, parent } = body;
      const response = await options.loader.createBlock(slotId, block, parent);
      return json(response);
    }
    if (type === 'update-block') {
      const { slotId, blockId, block, parent } = body;
      await options.loader.updateBlock(slotId, blockId, block, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'delete-block') {
      const { slotId, blockId, parent } = body;
      await options.loader.deleteBlock(slotId, blockId, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'reorder-blocks') {
      const { slotId, blockIds, parent } = body;
      await options.loader.reorderBlocks(slotId, blockIds, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'update-slot-options') {
      const { slotId, options, parent } = body;
      await options.loader.updateSlotOptions(slotId, options, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'update-block-props') {
      const { slotId, blockId, props, parent } = body;
      await options.loader.updateBlockProps(slotId, blockId, props, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'move-block-up') {
      const { slotId, blockId, parent } = body;
      await options.loader.moveBlockUp(slotId, blockId, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'move-block-down') {
      const { slotId, blockId, parent } = body;
      await options.loader.moveBlockDown(slotId, blockId, parent);
      const response = { success: true };
      return json(response);
    }
    if (type === 'generate-screenshots') {
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

    throw new Error(`Invalid request type ${type}`);
  };
}
