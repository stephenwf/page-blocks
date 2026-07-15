import { readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { link, mkdir, open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export function* readAllFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* readAllFiles(file);
    } else if (entry.isFile()) {
      yield file;
    }
  }
}

export function resolveWithinRoot(root: string, relativePath: string) {
  if (isAbsolute(relativePath) || relativePath.includes('\0') || relativePath.includes('\\')) {
    throw new Error(`Path must be a safe relative path: "${relativePath}".`);
  }

  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, relativePath);
  const fromRoot = relative(resolvedRoot, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromRoot)) {
    throw new Error(`Path escapes the Page Blocks root: "${relativePath}".`);
  }
  return target;
}

export async function atomicWriteFile(file: string, data: string, options: { create?: boolean } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx');

  try {
    await handle.writeFile(data, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    if (options.create) {
      await link(temporary, file);
      await unlink(temporary);
    } else {
      await rename(temporary, file);
    }
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}
