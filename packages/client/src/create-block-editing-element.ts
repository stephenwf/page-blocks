import { DirectoryOptions } from '@page-blocks/core';
import { QueryClient } from '@tanstack/query-core';

export function createBlockEditorElement(options: DirectoryOptions<any>) {
  return (query?: QueryClient) => {
    const $el = document.createElement('pb-editor') as any;
    $el.queryClient = query;
    $el.options = options;
    return $el as HTMLElement;
  };
}
