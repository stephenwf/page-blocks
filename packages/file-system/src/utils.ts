import fs from 'fs';
import path from 'path';

export function* readAllFiles(dir: string): Generator<string> {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

export function textToBase64(text: string): string {
  return Buffer.from(text).toString('base64');
}

export function base64ToText(base64: string): string {
  return Buffer.from(base64, 'base64').toString();
}
