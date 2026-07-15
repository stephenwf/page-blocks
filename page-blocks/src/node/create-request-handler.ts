import { isPageBlocksMutation, parseSlotApiResponse, slotApiRequestSchema } from '../core';
import { ServerOptions } from './types';

export function createRequestHandler(options: ServerOptions<any>) {
  let init = false;
  const invalidateSlots = options.invalidateSlots;
  return async (input: unknown): Promise<{ body: unknown; status: number }> => {
    const parsed = slotApiRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: {
            code: 'invalid_request',
            message: 'The Page Blocks request is invalid.',
            issues: parsed.error.issues,
          },
        },
      };
    }

    const body = parsed.data;
    const json = async (resp: unknown, status = 200) => {
      const response = status < 300 ? parseSlotApiResponse(body.type, resp) : resp;
      if (invalidateSlots && status < 300 && isPageBlocksMutation(body.type)) {
        await invalidateSlots();
      }
      return { body: response, status };
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
        await options.loader.createInnerSlot(slotId, slot, parent);
        return json({ success: true });
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
        return json(response);
      }
      case 'delete-inner-slot': {
        const { slotId, parent } = body;
        await options.loader.deleteInnerSlot(slotId, parent);
        const response = { success: true };
        return json(response);
      }
      case 'get-slot': {
        const { slotId, parent } = body;
        if (parent) {
          const response = await options.loader.findInnerSlot(slotId, parent);
          return json(response);
        }
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
        const { slotId, options: slotOptions, parent } = body;
        await options.loader.updateSlotOptions(slotId, slotOptions, parent);
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
          await options.generateScreenshots();
        }

        return json({ success: true });
      }
    }
    const exhaustive: never = body;
    throw new Error(`Unhandled Page Blocks request: ${String(exhaustive)}`);
  };
}
