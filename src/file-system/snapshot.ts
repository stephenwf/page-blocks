import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { slotDocumentSchema } from '../core';
import type { StoredPageBlocksDocument } from '../server/types';
import { parseSingleFile } from './parse-single-file';
import { buildSlotFilePath, contextFlatNodeToMatches, validateSlotLocator } from './slot-path';
import { resolveWithinRoot } from './utils';

export const pageBlocksSnapshotManifestFile = 'page-blocks.snapshot';

const snapshotFileSchema = z.object({
  path: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const pageBlocksSnapshotManifestSchema = z.object({
  formatVersion: z.literal(1),
  directoryVersion: z.string().min(1),
  sourceRevision: z.string().min(1),
  contexts: z.array(z.string()).max(100),
  files: z.array(snapshotFileSchema).max(100_000),
}).strict();
export type PageBlocksSnapshotManifest = z.infer<typeof pageBlocksSnapshotManifestSchema>;

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function checksum(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function exportPageBlocksSnapshot(options: {
  documents: Array<Pick<StoredPageBlocksDocument, 'locator' | 'version' | 'document'>>;
  contexts: string[];
  targetDirectory: string;
  directoryVersion: string;
  sourceRevision: string;
}) {
  const target = resolve(options.targetDirectory);
  const planned = options.documents.map((record) => {
    validateSlotLocator(record.locator, options.contexts);
    const path = buildSlotFilePath(record.locator.slot, record.locator.matches, options.contexts);
    const document = slotDocumentSchema.parse(record.document);
    return { path, content: formatJson({ ...document, version: record.version }) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(planned.map((file) => file.path)).size !== planned.length) {
    throw new Error('The Page Blocks snapshot contains colliding slot locators.');
  }

  await mkdir(dirname(target), { recursive: true });
  const temporary = await mkdtemp(join(dirname(target), `.${basename(target)}.tmp-`));
  try {
    for (const file of planned) {
      const absolute = resolveWithinRoot(temporary, file.path);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, { encoding: 'utf8', flag: 'wx' });
    }
    const manifest = pageBlocksSnapshotManifestSchema.parse({
      formatVersion: 1,
      directoryVersion: options.directoryVersion,
      sourceRevision: options.sourceRevision,
      contexts: options.contexts,
      files: planned.map((file) => ({ path: file.path, checksum: checksum(file.content) })),
    });
    await writeFile(join(temporary, pageBlocksSnapshotManifestFile), formatJson(manifest), { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, target);
    return manifest;
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function importPageBlocksDirectory(options: {
  sourceDirectory: string;
  expectedDirectoryVersion?: string;
  scope?: string;
}) {
  const source = resolve(options.sourceDirectory);
  const manifest = pageBlocksSnapshotManifestSchema.parse(
    JSON.parse(await readFile(join(source, pageBlocksSnapshotManifestFile), 'utf8'))
  );
  if (options.expectedDirectoryVersion && manifest.directoryVersion !== options.expectedDirectoryVersion) {
    throw new Error(
      `Snapshot directory version is "${manifest.directoryVersion}", expected "${options.expectedDirectoryVersion}".`
    );
  }

  const documents: StoredPageBlocksDocument[] = [];
  for (const file of manifest.files) {
    const absolute = resolveWithinRoot(source, file.path);
    if (!(await lstat(absolute)).isFile()) throw new Error(`Snapshot entry is not a regular file: "${file.path}".`);
    const content = await readFile(absolute, 'utf8');
    if (checksum(content) !== file.checksum) throw new Error(`Snapshot checksum failed for "${file.path}".`);
    const entry = parseSingleFile(file.path, manifest.contexts);
    if (!entry) throw new Error(`Snapshot path is not a slot document: "${file.path}".`);
    const json = JSON.parse(content);
    const version = z.number().int().positive().parse(json.version || 1);
    const { version: _version, ...document } = json;
    documents.push({
      id: entry.id,
      scope: options.scope || 'default',
      locator: { slot: entry.slot, matches: contextFlatNodeToMatches(entry, manifest.contexts) },
      version,
      document: slotDocumentSchema.parse(document),
    });
  }

  documents.sort((a, b) => buildSlotFilePath(a.locator.slot, a.locator.matches, manifest.contexts)
    .localeCompare(buildSlotFilePath(b.locator.slot, b.locator.matches, manifest.contexts)));
  return { manifest, documents };
}
