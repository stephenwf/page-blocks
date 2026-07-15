import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const files = [
  ['src/react/styles.css', 'dist/react/style.css'],
  ['src/react-editor/styles.css', 'dist/react-editor/style.css'],
  ['src/react-editor/styles.css', 'dist/editor/style.css'],
  ['src/web-components/index.css', 'dist/web-components/style.css'],
];

for (const [from, to] of files) {
  const target = resolve(root, to);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(resolve(root, from), target);
}

for (const entry of ['core', 'node', 'next', 'file-system', 'screenshots']) {
  const esm = resolve(root, 'dist', entry, 'index.mjs');
  const dts = resolve(root, 'dist', entry, 'index.d.mts');

  if (existsSync(esm)) {
    cpSync(esm, resolve(root, 'dist', entry, 'index.js'));
  }

  if (existsSync(dts)) {
    cpSync(dts, resolve(root, 'dist', entry, 'index.d.ts'));
  }
}

writeFileSync(
  resolve(root, 'dist/style.d.ts'),
  `declare const css: string;
export default css;
`,
  'utf8'
);
