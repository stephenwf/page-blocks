import { DirectoryOptions } from '../core';

type QueryClientLike = unknown;

export function createBlockEditorElement(options: DirectoryOptions<any>) {
  return (query?: QueryClientLike) => {
    const $el = document.createElement('pb-editor') as any;
    $el.queryClient = query;
    $el.options = options;
    return $el as HTMLElement;
  };
}
