import { SlotApiRequest } from '@page-blocks/core';

export function createInvalidator(invalidate: (e: { req: SlotApiRequest; response: any }) => void) {
  if (typeof document === 'undefined') {
    return () => {};
  }
  const handler = (e: CustomEvent<{ req: SlotApiRequest; response: any }>) => {
    invalidate(e.detail);
  };

  document.addEventListener('@page-blocks/mutation' as any, handler);
  return () => {
    document.removeEventListener('@page-blocks/mutation' as any, handler);
  };
}
