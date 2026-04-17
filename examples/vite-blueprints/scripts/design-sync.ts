import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFileSystemLoader } from 'page-blocks/file-system';
import { syncBlueprintFiles } from 'page-blocks/designer';

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const loader = createFileSystemLoader({
    path: resolve(exampleRoot, 'slots-generated'),
    contexts: ['pokemon'],
  });

  await syncBlueprintFiles({
    root: exampleRoot,
    designs: ['src/designs/**/*.tsx'],
    contexts: ['pokemon'],
    loader,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
