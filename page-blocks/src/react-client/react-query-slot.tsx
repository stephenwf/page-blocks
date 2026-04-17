'use client';
import { useCurrentSlotCache, useVisibleSlots } from './context';
import { useQuery } from 'react-query';
import { useEffect } from 'react';
import { createInvalidator, createRemoteLoader } from '../client';
import { Prettify } from '../core';
import { RenderClientSlot, RenderClientSlotProps } from './render-client-slot';
import { mergePageBlocksContext } from '../vite/runtime';

export type ReactQuerySlotProps = Prettify<Omit<RenderClientSlotProps, 'slot'>>;
export function ReactQuerySlot(props: ReactQuerySlotProps) {
  const slotContext = mergePageBlocksContext((props.options.context as Record<string, string>) || {}, props.context);
  const slotCache = useCurrentSlotCache();
  const slots = useVisibleSlots();
  const slotsToRequest = slots.includes(props.name) ? slots : [props.name];
  const loader = createRemoteLoader(props.options);

  if (slots.length && !slots.includes(props.name)) {
    console.log('WARNING: Missing slot in the SlotContext `slots` prop: ', props.name, slots);
  }

  const [queryKey, queryFunction] = loader(slotContext, slotsToRequest);

  const { data: slotResponse, refetch } = useQuery(queryKey, queryFunction, {
    cacheTime: Infinity,
    staleTime: Infinity,
    placeholderData: slotCache || loader.getInitialData?.(slotContext, slotsToRequest) || undefined,
  });

  useEffect(
    () =>
      createInvalidator(() =>
        // When any block is saved, refetch.
        refetch()
      ),
    []
  );

  if (!slotResponse || !slotResponse?.slots) {
    return null; // Loading... to do.
  }

  return <RenderClientSlot {...props} slot={slotResponse.slots[props.name]} />;
}
