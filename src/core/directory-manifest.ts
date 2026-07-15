import { z, ZodTypeAny } from 'zod';
import { jsonValueSchema, pageBlocksNameSchema, slotDocumentSchema, SlotDocument } from './protocol';

export const slotPolicySchema = z.object({
  label: z.string().max(200).optional(),
  description: z.string().max(2_000).optional(),
  allowedBlocks: z.array(pageBlocksNameSchema).max(200).optional(),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  required: z.boolean().optional(),
}).strict().refine((policy) => policy.maxItems === undefined || (policy.minItems || 0) <= policy.maxItems, {
  message: 'minItems cannot exceed maxItems.',
});
export type SlotPolicy = z.infer<typeof slotPolicySchema>;

export const directoryBlockDefinitionSchema = z.object({
  type: pageBlocksNameSchema,
  label: z.string().min(1).max(200),
  description: z.string().max(2_000).optional(),
  icon: z.string().max(2_000).optional(),
  thumbnail: z.string().max(2_000).optional(),
  form: jsonValueSchema.optional(),
  innerSlots: z.record(pageBlocksNameSchema, slotPolicySchema).default({}),
  requiredContexts: z.array(pageBlocksNameSchema).max(100).default([]),
  optionalContexts: z.array(pageBlocksNameSchema).max(100).default([]),
}).strict();
export type DirectoryBlockDefinition = z.infer<typeof directoryBlockDefinitionSchema>;

export const directoryManifestSchema = z.object({
  formatVersion: z.literal(1),
  version: z.string().min(1).max(100),
  contexts: z.object({
    required: z.array(pageBlocksNameSchema).max(100).default([]),
    optional: z.array(pageBlocksNameSchema).max(100).default([]),
  }).strict(),
  blocks: z.array(directoryBlockDefinitionSchema).max(500),
  slots: z.array(z.object({ name: pageBlocksNameSchema, policy: slotPolicySchema }).strict()).max(500),
  aliases: z.record(pageBlocksNameSchema, pageBlocksNameSchema).default({}),
  migrations: z.array(z.object({
    from: z.string().min(1).max(100),
    to: z.string().min(1).max(100),
    description: z.string().max(2_000).optional(),
  }).strict()).max(100).default([]),
  presets: z.array(z.object({
    id: pageBlocksNameSchema,
    label: z.string().min(1).max(200),
    slot: pageBlocksNameSchema.optional(),
    document: slotDocumentSchema,
  }).strict()).max(200).default([]),
}).strict();
export type PageBlocksDirectoryManifest = z.infer<typeof directoryManifestSchema>;

export function defineSlot(name: string, policy: SlotPolicy = {}) {
  return { name: pageBlocksNameSchema.parse(name), policy: slotPolicySchema.parse(policy) };
}

export function createDirectoryManifest(input: Omit<PageBlocksDirectoryManifest, 'formatVersion'>) {
  return directoryManifestSchema.parse({
    formatVersion: 1,
    ...input,
    blocks: [...input.blocks].sort((a, b) => a.type.localeCompare(b.type)),
    slots: [...input.slots].sort((a, b) => a.name.localeCompare(b.name)),
    aliases: Object.fromEntries(Object.entries(input.aliases || {}).sort(([a], [b]) => a.localeCompare(b))),
    migrations: input.migrations || [],
    presets: [...(input.presets || [])].sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export interface PageBlocksDirectoryContract {
  manifest: PageBlocksDirectoryManifest;
  validateDocument(slot: string, document: SlotDocument): SlotDocument;
}

function validatePolicy(
  policy: SlotPolicy | undefined,
  document: SlotDocument,
  location: string,
  aliases: Record<string, string>
) {
  if (!policy) return;
  if (policy.minItems !== undefined && document.blocks.length < policy.minItems) {
    throw new Error(`${location} requires at least ${policy.minItems} blocks.`);
  }
  if (policy.maxItems !== undefined && document.blocks.length > policy.maxItems) {
    throw new Error(`${location} allows at most ${policy.maxItems} blocks.`);
  }
  if (policy.allowedBlocks) {
    const invalid = document.blocks.find((block) => !policy.allowedBlocks!.includes(aliases[block.type] || block.type));
    if (invalid) throw new Error(`Block type "${invalid.type}" is not allowed in ${location}.`);
  }
}

export function createDirectoryContract(
  manifestInput: PageBlocksDirectoryManifest,
  schemas: Record<string, ZodTypeAny> = {}
): PageBlocksDirectoryContract {
  const manifest = directoryManifestSchema.parse(manifestInput);
  const blocks = new Map(manifest.blocks.map((block) => [block.type, block]));
  const topSlots = new Map(manifest.slots.map((slot) => [slot.name, slot.policy]));

  const validate = (document: SlotDocument, policy: SlotPolicy | undefined, location: string): SlotDocument => {
    const parsed = slotDocumentSchema.parse(document);
    validatePolicy(policy, parsed, location, manifest.aliases);
    for (const block of parsed.blocks) {
      const canonicalType = manifest.aliases[block.type] || block.type;
      const definition = blocks.get(canonicalType);
      if (!definition) throw new Error(`Unknown block type "${block.type}" at ${location}.`);
      schemas[canonicalType]?.parse(block.data);
      for (const [name, innerPolicy] of Object.entries(definition.innerSlots)) {
        const inner = block.slots?.[name];
        if (innerPolicy.required && !inner) throw new Error(`Block "${block.id}" requires inner slot "${name}".`);
        if (inner) validate(inner, innerPolicy, `${location} > ${block.id}.${name}`);
      }
      for (const name of Object.keys(block.slots || {})) {
        if (!definition.innerSlots[name]) {
          throw new Error(`Inner slot "${name}" is not declared for block type "${canonicalType}".`);
        }
      }
    }
    return parsed;
  };

  return {
    manifest,
    validateDocument(slot, document) {
      return validate(document, topSlots.get(slot), `slot "${slot}"`);
    },
  };
}
