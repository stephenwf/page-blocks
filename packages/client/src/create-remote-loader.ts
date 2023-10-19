import { DirectoryOptions, SlotQueryResponse } from '@page-blocks/core';

export function createRemoteLoader(options: DirectoryOptions<any, any>) {
  return (slotContext: Record<string, string>, slotsToRequest: string[]) => {
    const key = ['@page-blocks/slot-request', { slotContext, slots: slotsToRequest }] as const;
    const getData = async () => {
      return fetch(options.resolver.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'request-slots', context: slotContext, slots: slotsToRequest }),
      }).then((res) => res.json()) as Promise<SlotQueryResponse>;
    };

    return [key, getData] as const;
  };
}
