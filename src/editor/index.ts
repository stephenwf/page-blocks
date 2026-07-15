'use client';

import type { DirectoryOptions } from '../core';
import { editingMode, editorStatus } from '../client/store';
import '../react-editor';

export * from '../react-editor';

export interface MountPageBlocksEditorOptions {
  directory: DirectoryOptions<any>;
  queryClient: unknown;
  target?: Element;
}

export function mountPageBlocksEditor(options: MountPageBlocksEditorOptions) {
  const element = document.createElement('pb-editor') as HTMLElement & {
    options: DirectoryOptions<any>;
    queryClient: unknown;
  };
  element.options = options.directory;
  element.queryClient = options.queryClient;
  (options.target || document.body).appendChild(element);
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (editorStatus.get() === 'saving') event.preventDefault();
  };
  window.addEventListener('beforeunload', beforeUnload);

  return {
    element,
    unmount() {
      editingMode.set(false);
      window.removeEventListener('beforeunload', beforeUnload);
      element.remove();
    },
  };
}
