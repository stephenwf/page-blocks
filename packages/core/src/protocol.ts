import { Prettify } from './utils';

export interface SlotRequest {
  type: 'request-slots';
  slots: string[];
  parent?: { blockId: string; slotId: string };
  context: Record<string, string>;
}

export interface CreateSlot {
  slot: string;
  matches: Array<
    | {
        id: string;
        type: 'exact';
        value: string;
      }
    | {
        id: string;
        type: 'all';
      }
    | {
        id: string;
        type: 'none';
      }
  >;
}

export interface CreateSlotRequest extends CreateSlot {
  type: 'create-slot';
}

export interface UpdateSlotRequest {
  type: 'update-slot';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  data: any;
}

export interface DeleteSlotRequest {
  type: 'delete-slot';
  slotId: string;
  parent?: { blockId: string; slotId: string };
}

export interface GetSlotRequest {
  type: 'get-slot';
  slotId: string;
  parent?: { blockId: string; slotId: string };
}

export interface CreateBlockRequest {
  type: 'create-block';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  block: any;
}

export interface UpdateBlockRequest {
  type: 'update-block';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  blockId: string;
  block: any;
}

export interface DeleteBlockRequest {
  type: 'delete-block';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  blockId: string;
}

export interface ReorderBlocksRequest {
  type: 'reorder-blocks';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  blockIds: string[];
}

export interface UpdateSlotOptionsRequest {
  type: 'update-slot-options';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  options: any;
}

export interface UpdateBlockPropsRequest {
  type: 'update-block-props';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  blockId: string;
  props: any;
}

export interface MoveBlockUpRequest {
  type: 'move-block-up';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  blockId: string;
}

export interface MoveBlockDownRequest {
  type: 'move-block-down';
  slotId: string;
  parent?: { blockId: string; slotId: string };
  blockId: string;
}

export interface CreateInnerSlotRequest {
  type: 'create-inner-slot';
  slotId: string;
  parent: { blockId: string; slotId: string };
  slot: any;
}

export interface DeleteInnerSlotRequest {
  type: 'delete-inner-slot';
  slotId: string;
  parent: { blockId: string; slotId: string };
}

export interface UpdateInnerSlotRequest {
  type: 'update-inner-slot';
  slotId: string;
  parent: { blockId: string; slotId: string };
  data: any;
}

export interface GenerateScreenshotsRequest {
  type: 'generate-screenshots';
}

export type BlockApiRequest =
  | CreateBlockRequest
  | UpdateBlockRequest
  | DeleteBlockRequest
  | ReorderBlocksRequest
  | UpdateSlotOptionsRequest
  | UpdateBlockPropsRequest
  | MoveBlockUpRequest
  | MoveBlockDownRequest;

export type SlotApiRequest =
  | SlotRequest
  | CreateSlotRequest
  | UpdateSlotRequest
  | DeleteSlotRequest
  | GetSlotRequest
  | CreateBlockRequest
  | UpdateBlockRequest
  | DeleteBlockRequest
  | ReorderBlocksRequest
  | UpdateSlotOptionsRequest
  | UpdateBlockPropsRequest
  | MoveBlockUpRequest
  | MoveBlockDownRequest
  | CreateInnerSlotRequest
  | DeleteInnerSlotRequest
  | UpdateInnerSlotRequest
  | GenerateScreenshotsRequest;

export interface SlotQueryResponse {
  slots: SlotResponse[];
  isEmpty: boolean;
  slotName: string[];
  context: Record<string, string>;
}

export interface BlockResponse {
  id: string;
  type: string;
  data: any;
}

type NestedSlot = Prettify<Omit<SlotResponse, 'blocks'> & { blocks: BlockResponse[] }>;

export type BlockWithSlotResponse = Prettify<
  BlockResponse & {
    slots: Record<string, NestedSlot>;
  }
>;

export type BlockWithOptionalSlotResponse = Prettify<
  BlockResponse & {
    slots?: Record<string, NestedSlot>;
  }
>;

export interface SlotQueryRequest {
  slot: string;
  blocks: BlockWithOptionalSlotResponse[];
  options?: any;
}

export interface SlotResponse {
  id: string;
  slot: string;
  blocks: BlockWithOptionalSlotResponse[];
  options?: any;
}

export interface SlotLoader {
  init(force?: boolean): Promise<void>;
  query(
    context: Record<string, string>,
    slotIds: string[]
  ): Promise<{ slots: SlotResponse[]; isEmpty: boolean; slotName: string[]; context: Record<string, string> }>;
  find(slotId: string): Promise<SlotResponse>;
  update(slotId: string, data: SlotResponse | SlotQueryRequest): Promise<void>;
  delete(slotId: string): Promise<void>;
  createSlot(request: CreateSlot): Promise<SlotResponse>;
}

export interface FullSlotLoader extends SlotLoader {
  createInnerSlot(slotId: string, slot: string, parent: { slotId: string; blockId: string }): Promise<void>;
  deleteInnerSlot(slotId: string, parent: { slotId: string; blockId: string }): Promise<void>;
  updateInnerSlot(
    slotId: string,
    data: SlotQueryRequest | SlotResponse,
    parent: { slotId: string; blockId: string }
  ): Promise<void>;

  createBlock(slotId: string, block: any, parent?: { slotId: string; blockId: string }): Promise<any>;
  deleteBlock(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateBlock(slotId: string, blockId: string, block: any, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateBlockProps(
    slotId: string,
    blockId: string,
    props: any,
    parent?: { slotId: string; blockId: string }
  ): Promise<void>;
  updateSlotOptions(slotId: string, details: any, parent?: { slotId: string; blockId: string }): Promise<void>;
  reorderBlocks(slotId: string, blockIds: string[], parent?: { slotId: string; blockId: string }): Promise<void>;
  moveBlockUp(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  moveBlockDown(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
}
