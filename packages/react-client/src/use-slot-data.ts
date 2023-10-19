import { useContext, useEffect } from 'react';
import { useCurrentSlotCache, useSlotContext, VisibleSlots } from './context';
import { useQuery } from 'react-query';
import { SlotApiRequest } from '@page-blocks/core';

export function useSlotData(
  { loader }: { loader: any },
  slotOptions: {
    slots?: string[];
    context?: Record<string, string>;
    cacheData?: any;
  } = {}
) {
  const { cacheData, slots: inputSlots, context = {} } = slotOptions;
  const visibleSlots = useContext(VisibleSlots);
  const slots = inputSlots || visibleSlots;
  const currentSlotContext = useSlotContext();
  const slotContext = { ...currentSlotContext, ...context };
  const slotCacheStore = useCurrentSlotCache();
  const slotCache = cacheData || slotCacheStore;
  const [queryKey, queryFunction] = loader(slotContext, slots);
  const resp = useQuery(queryKey, queryFunction, {
    cacheTime: Infinity,
    staleTime: Infinity,
    initialData: slotCache || undefined,
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handler = (e: CustomEvent<{ req: SlotApiRequest; response: any }>) => {
      resp.refetch().catch((err) => {
        console.error('Error refetching slot data', err);
      });
    };

    document.addEventListener('@page-blocks/mutation' as any, handler);
    return () => {
      document.removeEventListener('@page-blocks/mutation' as any, handler);
    };
  }, []);

  return resp;
}
