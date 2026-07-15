import { useContext, useEffect } from 'react';
import { useCurrentSlotCache, useSlotContext, VisibleSlots } from './context';
import { useQuery } from '@tanstack/react-query';
import { DirectoryOptions, SlotApiRequest } from '../core';
import { mergePageBlocksContext } from '../vite/runtime';

export function useSlotData(
  { loader, options }: { loader: any; options: DirectoryOptions<any> },
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
  const slotContext = mergePageBlocksContext(
    (options.context as Record<string, string>) || {},
    currentSlotContext,
    context
  );
  const slotCacheStore = useCurrentSlotCache();
  const slotCache = cacheData || slotCacheStore;
  const [queryKey, queryFunction] = loader(slotContext, slots);
  const resp = useQuery({
    queryKey,
    queryFn: queryFunction,
    gcTime: Infinity,
    staleTime: Infinity,
    placeholderData: slotCache || loader.getInitialData?.(slotContext, slots) || undefined,
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
