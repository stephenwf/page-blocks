import { z } from 'zod';
import {
  blockResponseSchema,
  contextNameSchema,
  contextSchema,
  contextValueSchema,
  jsonValueSchema,
  pageBlocksIdSchema,
  pageBlocksNameSchema,
  pageBlocksProtocolLimits,
  slotDocumentSchema,
  slotLocatorSchema,
  slotQueryResponseSchema,
  slotResponseSchema,
} from './protocol';

export const revisionSchema = z.number().int().positive();
export type Revision = z.infer<typeof revisionSchema>;

export const pageBlocksTargetSegmentSchema = z
  .object({
    blockId: pageBlocksIdSchema,
    slot: pageBlocksNameSchema,
  })
  .strict();
export const pageBlocksTargetSchema = z
  .object({
    documentId: pageBlocksIdSchema,
    path: z.array(pageBlocksTargetSegmentSchema).max(pageBlocksProtocolLimits.jsonDepth).default([]),
  })
  .strict();
export type PageBlocksTarget = z.infer<typeof pageBlocksTargetSchema>;

export const versionedDocumentSchema = z
  .object({
    id: pageBlocksIdSchema,
    scope: pageBlocksNameSchema,
    locator: slotLocatorSchema,
    version: revisionSchema,
    document: slotDocumentSchema,
  })
  .strict();
export type VersionedDocument = z.infer<typeof versionedDocumentSchema>;

const queryRequestSchema = z
  .object({
    type: z.literal('query'),
    context: contextSchema,
    slots: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots).optional(),
  })
  .strict();
const getRequestSchema = z.object({ type: z.literal('get'), target: pageBlocksTargetSchema }).strict();
const createRequestSchema = z
  .object({
    type: z.literal('create'),
    locator: slotLocatorSchema,
    document: slotDocumentSchema.optional(),
  })
  .strict();

const replaceSlotMutationSchema = z
  .object({ type: z.literal('replace-slot'), document: slotDocumentSchema })
  .strict();
const createBlockMutationSchema = z.object({ type: z.literal('create-block'), block: blockResponseSchema }).strict();
const updateBlockMutationSchema = z
  .object({ type: z.literal('update-block'), blockId: pageBlocksIdSchema, block: blockResponseSchema })
  .strict();
const deleteBlockMutationSchema = z
  .object({ type: z.literal('delete-block'), blockId: pageBlocksIdSchema })
  .strict();
const reorderBlocksMutationSchema = z
  .object({
    type: z.literal('reorder-blocks'),
    blockIds: z.array(pageBlocksIdSchema).max(pageBlocksProtocolLimits.blocks),
  })
  .strict();
const updateBlockPropsMutationSchema = z
  .object({ type: z.literal('update-block-props'), blockId: pageBlocksIdSchema, props: jsonValueSchema })
  .strict();
const updateSlotOptionsMutationSchema = z
  .object({ type: z.literal('update-slot-options'), options: jsonValueSchema })
  .strict();
const moveBlockMutationSchema = z
  .object({
    type: z.enum(['move-block-up', 'move-block-down']),
    blockId: pageBlocksIdSchema,
  })
  .strict();
const createInnerSlotMutationSchema = z
  .object({
    type: z.literal('create-inner-slot'),
    blockId: pageBlocksIdSchema,
    slot: pageBlocksNameSchema,
    document: slotDocumentSchema.optional(),
  })
  .strict();

export const pageBlocksMutationSchema = z.discriminatedUnion('type', [
  replaceSlotMutationSchema,
  createBlockMutationSchema,
  updateBlockMutationSchema,
  deleteBlockMutationSchema,
  reorderBlocksMutationSchema,
  updateBlockPropsMutationSchema,
  updateSlotOptionsMutationSchema,
  moveBlockMutationSchema,
  createInnerSlotMutationSchema,
]);
export type PageBlocksMutation = z.infer<typeof pageBlocksMutationSchema>;

const mutateRequestSchema = z
  .object({
    type: z.literal('mutate'),
    target: pageBlocksTargetSchema,
    expectedVersion: revisionSchema,
    mutation: pageBlocksMutationSchema,
  })
  .strict();
const deleteRequestSchema = z
  .object({
    type: z.literal('delete'),
    target: pageBlocksTargetSchema,
    expectedVersion: revisionSchema,
  })
  .strict();
const contextValuesRequestSchema = z
  .object({ type: z.literal('context-values'), context: contextNameSchema })
  .strict();
const subContextsRequestSchema = z.object({ type: z.literal('sub-contexts'), context: contextSchema }).strict();
const subContextBlocksRequestSchema = z
  .object({
    type: z.literal('sub-context-blocks'),
    context: contextSchema,
    options: z
      .object({
        searchValue: contextValueSchema.optional(),
        slotIds: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots).optional(),
        blockTypes: z.array(pageBlocksNameSchema).max(pageBlocksProtocolLimits.slots).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const pageBlocksServiceRequestSchema = z.discriminatedUnion('type', [
  queryRequestSchema,
  getRequestSchema,
  createRequestSchema,
  mutateRequestSchema,
  deleteRequestSchema,
  contextValuesRequestSchema,
  subContextsRequestSchema,
  subContextBlocksRequestSchema,
]);
export type PageBlocksServiceRequest = z.infer<typeof pageBlocksServiceRequestSchema>;

export const resolvedTargetSchema = z
  .object({
    document: versionedDocumentSchema,
    target: slotResponseSchema,
  })
  .strict();
export type ResolvedPageBlocksTarget = z.infer<typeof resolvedTargetSchema>;
export const mutationResponseSchema = resolvedTargetSchema.extend({ block: blockResponseSchema.optional() });
export type PageBlocksMutationResponse = z.infer<typeof mutationResponseSchema>;
export const deleteResponseSchema = z.object({ success: z.literal(true), version: revisionSchema }).strict();
export const contextValuesServiceResponseSchema = z.array(contextValueSchema).max(pageBlocksProtocolLimits.blocks);
export const subContextsServiceResponseSchema = z.array(contextSchema).max(pageBlocksProtocolLimits.blocks);
export const subContextBlocksServiceResponseSchema = z
  .array(
    z
      .object({
        context: contextSchema,
        blocks: z.array(blockResponseSchema).max(pageBlocksProtocolLimits.blocks),
      })
      .strict()
  )
  .max(pageBlocksProtocolLimits.blocks);

export interface PageBlocksServiceResponseMap {
  query: z.infer<typeof slotQueryResponseSchema>;
  get: ResolvedPageBlocksTarget;
  create: ResolvedPageBlocksTarget;
  mutate: PageBlocksMutationResponse;
  delete: z.infer<typeof deleteResponseSchema>;
  'context-values': string[];
  'sub-contexts': Array<Record<string, string>>;
  'sub-context-blocks': z.infer<typeof subContextBlocksServiceResponseSchema>;
}

const serviceResponseSchemas = {
  query: slotQueryResponseSchema,
  get: resolvedTargetSchema,
  create: resolvedTargetSchema,
  mutate: mutationResponseSchema,
  delete: deleteResponseSchema,
  'context-values': contextValuesServiceResponseSchema,
  'sub-contexts': subContextsServiceResponseSchema,
  'sub-context-blocks': subContextBlocksServiceResponseSchema,
} satisfies Record<keyof PageBlocksServiceResponseMap, z.ZodTypeAny>;

export function parsePageBlocksServiceResponse<Type extends keyof PageBlocksServiceResponseMap>(
  type: Type,
  value: unknown
) {
  return serviceResponseSchemas[type].parse(value) as PageBlocksServiceResponseMap[Type];
}

export type PageBlocksServiceOperationClass = 'read' | 'write';
export function getPageBlocksServiceOperationClass(
  type: PageBlocksServiceRequest['type']
): PageBlocksServiceOperationClass {
  return type === 'create' || type === 'mutate' || type === 'delete' ? 'write' : 'read';
}
