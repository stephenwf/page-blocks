import { z } from 'zod';
import { Prettify } from './utils';

export const pageBlocksProtocolLimits = {
  id: 256,
  name: 128,
  contextValue: 2048,
  contexts: 32,
  slots: 100,
  blocks: 1000,
  jsonString: 100_000,
  jsonArray: 1000,
  jsonObjectKeys: 200,
  jsonDepth: 20,
} as const;

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function createJsonValueSchema(depth: number): z.ZodType<JsonValue> {
  const primitive = z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string().max(pageBlocksProtocolLimits.jsonString),
  ]);

  if (depth === 0) {
    return primitive;
  }

  const child = createJsonValueSchema(depth - 1);
  const object = z.record(child).superRefine((value, context) => {
    if (Object.keys(value).length > pageBlocksProtocolLimits.jsonObjectKeys) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Objects may contain at most ${pageBlocksProtocolLimits.jsonObjectKeys} keys`,
      });
    }
  });

  return z.union([primitive, z.array(child).max(pageBlocksProtocolLimits.jsonArray), object]);
}

export const jsonValueSchema = createJsonValueSchema(pageBlocksProtocolLimits.jsonDepth);
export const pageBlocksIdSchema = z.string().min(1).max(pageBlocksProtocolLimits.id);
export const pageBlocksNameSchema = z.string().min(1).max(pageBlocksProtocolLimits.name);
export const contextNameSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
export const contextValueSchema = z.string().max(pageBlocksProtocolLimits.contextValue);
export const contextSchema = z
  .record(contextNameSchema, contextValueSchema)
  .superRefine((value, context) => {
    if (Object.keys(value).length > pageBlocksProtocolLimits.contexts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Contexts may contain at most ${pageBlocksProtocolLimits.contexts} values`,
      });
    }
  });

export const nestedTargetSchema = z
  .object({
    blockId: pageBlocksIdSchema,
    slotId: pageBlocksIdSchema,
  })
  .strict();

export const exactSlotMatchSchema = z
  .object({
    id: contextNameSchema,
    type: z.literal('exact'),
    value: contextValueSchema,
  })
  .strict();
export const allSlotMatchSchema = z.object({ id: contextNameSchema, type: z.literal('all') }).strict();
export const noneSlotMatchSchema = z.object({ id: contextNameSchema, type: z.literal('none') }).strict();
export const slotMatchSchema = z.discriminatedUnion('type', [
  exactSlotMatchSchema,
  allSlotMatchSchema,
  noneSlotMatchSchema,
]);

const slotLocatorFields = {
  slot: pageBlocksNameSchema,
  matches: z.array(slotMatchSchema).max(pageBlocksProtocolLimits.contexts),
};
const validateUniqueMatches = (locator: { matches: Array<{ id: string }> }, context: z.RefinementCtx) => {
  const ids = new Set<string>();
  for (const match of locator.matches) {
    if (ids.has(match.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['matches'],
        message: `Context "${match.id}" is matched more than once`,
      });
    }
    ids.add(match.id);
  }
};
export const slotLocatorSchema = z
  .object(slotLocatorFields)
  .strict()
  .superRefine(validateUniqueMatches);

export interface NestedSlotDocument {
  id?: string;
  slot?: string;
  slot_id?: string;
  name?: string;
  blocks: BlockWithOptionalSlotResponse[];
  options?: JsonValue;
}

export interface BlockResponse {
  id: string;
  type: string;
  data: JsonValue;
}

export type BlockWithOptionalSlotResponse = Prettify<
  BlockResponse & {
    slots?: Record<string, NestedSlotDocument>;
  }
>;

export type BlockWithSlotResponse = Prettify<
  BlockResponse & {
    slots: Record<string, NestedSlotDocument>;
  }
>;

export const blockResponseSchema: z.ZodType<BlockWithOptionalSlotResponse> = z.lazy(() =>
  z
    .object({
      id: pageBlocksIdSchema,
      type: pageBlocksNameSchema,
      data: jsonValueSchema,
      slots: z.record(pageBlocksNameSchema, nestedSlotDocumentSchema).optional(),
    })
    .strict()
);

export const nestedSlotDocumentSchema: z.ZodType<NestedSlotDocument> = z.lazy(() =>
  z
    .object({
      id: pageBlocksIdSchema.optional(),
      slot: pageBlocksNameSchema.optional(),
      slot_id: pageBlocksNameSchema.optional(),
      name: pageBlocksNameSchema.optional(),
      blocks: z.array(blockResponseSchema).max(pageBlocksProtocolLimits.blocks),
      options: jsonValueSchema.optional(),
    })
    .strict()
);

export interface SlotSourceContextMatch {
  id: string;
  type: 'exact' | 'all' | 'none';
  value?: string;
}

export interface SlotSourceMetadata {
  filePath: string;
  matchedContexts: SlotSourceContextMatch[];
  embeddedIn?: { slotId: string; blockId: string };
}

export interface SlotDocument {
  id?: string;
  slot?: string;
  name?: string;
  blocks: BlockWithOptionalSlotResponse[];
  options?: JsonValue;
  version?: number;
  source?: SlotSourceMetadata;
}

export interface SlotResponse extends SlotDocument {
  id: string;
  slot: string;
}

export const slotSourceContextMatchSchema: z.ZodType<SlotSourceContextMatch> = z.discriminatedUnion('type', [
  exactSlotMatchSchema,
  allSlotMatchSchema,
  noneSlotMatchSchema,
]);
export const slotSourceMetadataSchema: z.ZodType<SlotSourceMetadata> = z
  .object({
    filePath: z.string().min(1).max(pageBlocksProtocolLimits.contextValue),
    matchedContexts: z.array(slotSourceContextMatchSchema).max(pageBlocksProtocolLimits.contexts),
    embeddedIn: nestedTargetSchema.optional(),
  })
  .strict();
const slotDocumentObjectSchema = z
  .object({
    id: pageBlocksIdSchema.optional(),
    slot: pageBlocksNameSchema.optional(),
    name: pageBlocksNameSchema.optional(),
    blocks: z.array(blockResponseSchema).max(pageBlocksProtocolLimits.blocks),
    options: jsonValueSchema.optional(),
    version: z.number().int().positive().optional(),
    source: slotSourceMetadataSchema.optional(),
  })
  .strict();
export const slotDocumentSchema: z.ZodType<SlotDocument> = slotDocumentObjectSchema;
export const slotResponseSchema: z.ZodType<SlotResponse> = slotDocumentObjectSchema.extend({
  id: pageBlocksIdSchema,
  slot: pageBlocksNameSchema,
});

export const slotQueryRequestSchema = z
  .object({
    slot: pageBlocksNameSchema,
    blocks: z.array(blockResponseSchema).max(pageBlocksProtocolLimits.blocks),
    options: jsonValueSchema.optional(),
  })
  .strict();
export type SlotQueryRequest = z.infer<typeof slotQueryRequestSchema>;

const requestSlotsSchema = z
  .object({
    type: z.literal('request-slots'),
    slots: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots),
    parent: nestedTargetSchema.optional(),
    context: contextSchema,
  })
  .strict();
const createSlotRequestSchema = z
  .object({ type: z.literal('create-slot'), ...slotLocatorFields })
  .strict();
const updateSlotRequestSchema = z
  .object({
    type: z.literal('update-slot'),
    slotId: pageBlocksIdSchema,
    parent: nestedTargetSchema.optional(),
    data: slotDocumentSchema,
  })
  .strict();
const slotTargetRequestFields = {
  slotId: pageBlocksIdSchema,
  parent: nestedTargetSchema.optional(),
};
const deleteSlotRequestSchema = z.object({ type: z.literal('delete-slot'), ...slotTargetRequestFields }).strict();
const getSlotRequestSchema = z.object({ type: z.literal('get-slot'), ...slotTargetRequestFields }).strict();
const createBlockRequestSchema = z
  .object({ type: z.literal('create-block'), ...slotTargetRequestFields, block: blockResponseSchema })
  .strict();
const updateBlockRequestSchema = z
  .object({
    type: z.literal('update-block'),
    ...slotTargetRequestFields,
    blockId: pageBlocksIdSchema,
    block: blockResponseSchema,
  })
  .strict();
const deleteBlockRequestSchema = z
  .object({ type: z.literal('delete-block'), ...slotTargetRequestFields, blockId: pageBlocksIdSchema })
  .strict();
const reorderBlocksRequestSchema = z
  .object({
    type: z.literal('reorder-blocks'),
    ...slotTargetRequestFields,
    blockIds: z.array(pageBlocksIdSchema).max(pageBlocksProtocolLimits.blocks),
  })
  .strict();
const updateSlotOptionsRequestSchema = z
  .object({ type: z.literal('update-slot-options'), ...slotTargetRequestFields, options: jsonValueSchema })
  .strict();
const updateBlockPropsRequestSchema = z
  .object({
    type: z.literal('update-block-props'),
    ...slotTargetRequestFields,
    blockId: pageBlocksIdSchema,
    props: jsonValueSchema,
  })
  .strict();
const moveBlockUpRequestSchema = z
  .object({ type: z.literal('move-block-up'), ...slotTargetRequestFields, blockId: pageBlocksIdSchema })
  .strict();
const moveBlockDownRequestSchema = z
  .object({ type: z.literal('move-block-down'), ...slotTargetRequestFields, blockId: pageBlocksIdSchema })
  .strict();
const createInnerSlotRequestSchema = z
  .object({
    type: z.literal('create-inner-slot'),
    slotId: pageBlocksIdSchema,
    parent: nestedTargetSchema,
    slot: pageBlocksNameSchema,
  })
  .strict();
const deleteInnerSlotRequestSchema = z
  .object({ type: z.literal('delete-inner-slot'), slotId: pageBlocksIdSchema, parent: nestedTargetSchema })
  .strict();
const updateInnerSlotRequestSchema = z
  .object({
    type: z.literal('update-inner-slot'),
    slotId: pageBlocksIdSchema,
    parent: nestedTargetSchema,
    data: nestedSlotDocumentSchema,
  })
  .strict();
const generateScreenshotsRequestSchema = z.object({ type: z.literal('generate-screenshots') }).strict();
const queryContextValuesRequestSchema = z
  .object({ type: z.literal('query-context-values'), context: contextNameSchema })
  .strict();
const querySubContextRequestSchema = z.object({ type: z.literal('query-sub-context'), context: contextSchema }).strict();
const querySubContextBlocksRequestSchema = z
  .object({
    type: z.literal('query-sub-context-blocks'),
    context: contextSchema,
    options: z
      .object({
        searchValue: z.string().max(pageBlocksProtocolLimits.contextValue).optional(),
        slotIds: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots).optional(),
        blockTypes: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const slotApiRequestSchema = z.discriminatedUnion('type', [
  requestSlotsSchema,
  createSlotRequestSchema,
  updateSlotRequestSchema,
  deleteSlotRequestSchema,
  getSlotRequestSchema,
  createBlockRequestSchema,
  updateBlockRequestSchema,
  deleteBlockRequestSchema,
  reorderBlocksRequestSchema,
  updateSlotOptionsRequestSchema,
  updateBlockPropsRequestSchema,
  moveBlockUpRequestSchema,
  moveBlockDownRequestSchema,
  createInnerSlotRequestSchema,
  deleteInnerSlotRequestSchema,
  updateInnerSlotRequestSchema,
  generateScreenshotsRequestSchema,
  queryContextValuesRequestSchema,
  querySubContextRequestSchema,
  querySubContextBlocksRequestSchema,
]).superRefine((request, context) => {
  if (request.type === 'create-slot') {
    validateUniqueMatches(request, context);
  }
});

export type SlotRequest = z.infer<typeof requestSlotsSchema>;
export type CreateSlot = z.infer<typeof slotLocatorSchema>;
export type CreateSlotRequest = z.infer<typeof createSlotRequestSchema>;
export type UpdateSlotRequest = z.infer<typeof updateSlotRequestSchema>;
export type DeleteSlotRequest = z.infer<typeof deleteSlotRequestSchema>;
export type GetSlotRequest = z.infer<typeof getSlotRequestSchema>;
export type CreateBlockRequest = z.infer<typeof createBlockRequestSchema>;
export type UpdateBlockRequest = z.infer<typeof updateBlockRequestSchema>;
export type DeleteBlockRequest = z.infer<typeof deleteBlockRequestSchema>;
export type ReorderBlocksRequest = z.infer<typeof reorderBlocksRequestSchema>;
export type UpdateSlotOptionsRequest = z.infer<typeof updateSlotOptionsRequestSchema>;
export type UpdateBlockPropsRequest = z.infer<typeof updateBlockPropsRequestSchema>;
export type MoveBlockUpRequest = z.infer<typeof moveBlockUpRequestSchema>;
export type MoveBlockDownRequest = z.infer<typeof moveBlockDownRequestSchema>;
export type CreateInnerSlotRequest = z.infer<typeof createInnerSlotRequestSchema>;
export type DeleteInnerSlotRequest = z.infer<typeof deleteInnerSlotRequestSchema>;
export type UpdateInnerSlotRequest = z.infer<typeof updateInnerSlotRequestSchema>;
export type GenerateScreenshotsRequest = z.infer<typeof generateScreenshotsRequestSchema>;
export type QueryContextValuesRequest = z.infer<typeof queryContextValuesRequestSchema>;
export type QuerySubContextRequest = z.infer<typeof querySubContextRequestSchema>;
export type QuerySubContextBlocksRequest = z.infer<typeof querySubContextBlocksRequestSchema>;
export type SlotApiRequest = z.infer<typeof slotApiRequestSchema>;
export type BlockApiRequest = Extract<
  SlotApiRequest,
  {
    type:
      | 'create-block'
      | 'update-block'
      | 'delete-block'
      | 'reorder-blocks'
      | 'update-slot-options'
      | 'update-block-props'
      | 'move-block-up'
      | 'move-block-down';
  }
>;

export interface SlotQueryResponse {
  slots: Record<string, SlotResponse>;
  isEmpty: boolean;
  slotNames: string[];
  context: Record<string, string>;
}

export const slotQueryResponseSchema: z.ZodType<SlotQueryResponse> = z
  .object({
    slots: z.record(pageBlocksNameSchema, slotResponseSchema),
    isEmpty: z.boolean(),
    slotNames: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots),
    context: contextSchema,
  })
  .strict();
export const successResponseSchema = z.object({ success: z.literal(true) }).strict();
export const contextValuesResponseSchema = z.array(contextValueSchema).max(pageBlocksProtocolLimits.blocks);
export const subContextResponseSchema = z.array(contextSchema).max(pageBlocksProtocolLimits.blocks);
export const subContextBlocksResponseSchema = z
  .array(
    z
      .object({
        context: contextSchema,
        blocks: z.array(blockResponseSchema).max(pageBlocksProtocolLimits.blocks),
      })
      .strict()
  )
  .max(pageBlocksProtocolLimits.blocks);

const responseSchemas = {
  'request-slots': slotQueryResponseSchema,
  'create-slot': slotResponseSchema,
  'update-slot': successResponseSchema,
  'delete-slot': successResponseSchema,
  'get-slot': slotResponseSchema,
  'create-block': blockResponseSchema,
  'update-block': successResponseSchema,
  'delete-block': successResponseSchema,
  'reorder-blocks': successResponseSchema,
  'update-slot-options': successResponseSchema,
  'update-block-props': successResponseSchema,
  'move-block-up': successResponseSchema,
  'move-block-down': successResponseSchema,
  'create-inner-slot': successResponseSchema,
  'delete-inner-slot': successResponseSchema,
  'update-inner-slot': successResponseSchema,
  'generate-screenshots': successResponseSchema,
  'query-context-values': contextValuesResponseSchema,
  'query-sub-context': subContextResponseSchema,
  'query-sub-context-blocks': subContextBlocksResponseSchema,
} satisfies Record<SlotApiRequest['type'], z.ZodTypeAny>;

export interface SlotApiResponseMap {
  'request-slots': SlotQueryResponse;
  'create-slot': SlotResponse;
  'update-slot': { success: true };
  'delete-slot': { success: true };
  'get-slot': SlotResponse;
  'create-block': BlockWithOptionalSlotResponse;
  'update-block': { success: true };
  'delete-block': { success: true };
  'reorder-blocks': { success: true };
  'update-slot-options': { success: true };
  'update-block-props': { success: true };
  'move-block-up': { success: true };
  'move-block-down': { success: true };
  'create-inner-slot': { success: true };
  'delete-inner-slot': { success: true };
  'update-inner-slot': { success: true };
  'generate-screenshots': { success: true };
  'query-context-values': string[];
  'query-sub-context': Array<Record<string, string>>;
  'query-sub-context-blocks': Array<{
    context: Record<string, string>;
    blocks: BlockWithOptionalSlotResponse[];
  }>;
}

export function parseSlotApiResponse<Type extends keyof SlotApiResponseMap>(type: Type, value: unknown) {
  return responseSchemas[type].parse(value) as SlotApiResponseMap[Type];
}

export type PageBlocksOperationClass = 'read' | 'write' | 'privileged';
export function getPageBlocksOperationClass(type: SlotApiRequest['type']): PageBlocksOperationClass {
  if (type === 'generate-screenshots') {
    return 'privileged';
  }

  if (
    type === 'request-slots' ||
    type === 'get-slot' ||
    type === 'query-context-values' ||
    type === 'query-sub-context' ||
    type === 'query-sub-context-blocks'
  ) {
    return 'read';
  }

  return 'write';
}

export function isPageBlocksMutation(type: SlotApiRequest['type']) {
  return getPageBlocksOperationClass(type) === 'write';
}

export interface SlotLoader {
  init(force?: boolean): Promise<void>;
  query(context: Record<string, string>, slotIds?: string[]): Promise<SlotQueryResponse>;
  find(slotId: string): Promise<SlotResponse>;
  update(slotId: string, data: SlotDocument | SlotQueryRequest): Promise<void>;
  delete(slotId: string): Promise<void>;
  createSlot(request: CreateSlot): Promise<SlotResponse>;
  queryContextValues(context: string): Promise<string[]>;
  querySubContext(context: Record<string, string>): Promise<Array<Record<string, string>>>;
}

export interface FullSlotLoader extends SlotLoader {
  findInnerSlot(slotId: string, parent: { slotId: string; blockId: string }): Promise<SlotResponse>;
  createInnerSlot(slotId: string, slot: string, parent: { slotId: string; blockId: string }): Promise<void>;
  deleteInnerSlot(slotId: string, parent: { slotId: string; blockId: string }): Promise<void>;
  updateInnerSlot(
    slotId: string,
    data: SlotQueryRequest | NestedSlotDocument,
    parent: { slotId: string; blockId: string }
  ): Promise<void>;
  createBlock(slotId: string, block: BlockWithOptionalSlotResponse, parent?: { slotId: string; blockId: string }): Promise<BlockWithOptionalSlotResponse>;
  deleteBlock(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateBlock(slotId: string, blockId: string, block: BlockWithOptionalSlotResponse, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateBlockProps(slotId: string, blockId: string, props: JsonValue, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateSlotOptions(slotId: string, details: JsonValue, parent?: { slotId: string; blockId: string }): Promise<void>;
  reorderBlocks(slotId: string, blockIds: string[], parent?: { slotId: string; blockId: string }): Promise<void>;
  moveBlockUp(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  moveBlockDown(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  querySubContextBlocks(
    context: Record<string, string>,
    options?: { searchValue?: string; slotIds?: string[]; blockTypes?: string[] }
  ): Promise<Array<{ context: Record<string, string>; blocks: BlockWithOptionalSlotResponse[] }>>;
}
