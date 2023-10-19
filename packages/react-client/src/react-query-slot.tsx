'use client';
import { useCurrentSlotCache, useVisibleSlots } from './context';
import { useQuery } from 'react-query';
import { useEffect } from 'react';
import { createInvalidator, createRemoteLoader } from '@page-blocks/client';
import { Prettify } from '@page-blocks/core';
import { RenderClientSlot, RenderClientSlotProps } from './render-client-slot';

export type ReactQuerySlotProps = Prettify<Omit<RenderClientSlotProps, 'slot'>>;
export function ReactQuerySlot(props: ReactQuerySlotProps) {
  const slotContext = props.context;
  const slotCache = useCurrentSlotCache();
  const slots = useVisibleSlots();
  const slotsToRequest = slots.includes(props.name) ? slots : [props.name];

  if (slots.length && !slots.includes(props.name)) {
    console.log('WARNING: Missing slot in the SlotContext `slots` prop: ', props.name, slots);
  }

  const [queryKey, queryFunction] = createRemoteLoader(props.options)(slotContext, slotsToRequest);

  const { data: slotResponse, refetch } = useQuery(queryKey, queryFunction, {
    cacheTime: Infinity,
    staleTime: Infinity,
    initialData: slotCache || undefined,
    keepPreviousData: true,
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
