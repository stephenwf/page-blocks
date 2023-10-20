'use client';

import { ReactNode, useMemo, useRef } from 'react';
import { SlotCache, SlotContextValue, SlotReactContext, useSlotContext, VisibleSlots } from './context';
import { DirectoryOptions } from '@page-blocks/core';
import { useSlotData } from './use-slot-data';

export interface SlotContextProps {
  name?: string;
  value?: string;
  cache?: any;
  slots?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  dependencies?: any[];
}

export function SlotContext(props: SlotContextProps & { options: DirectoryOptions; loader: any }) {
  const cacheRef = useRef<any>();
  const nameRef = useRef<any>();
  let invalidCache = false;
  if (!nameRef.current) {
    nameRef.current = props.name;
  }
  if (!cacheRef.current) {
    // Only store the INITIAL cache value
    cacheRef.current = props.value;
  }
  if (nameRef.current !== props.name) {
    console.log('WARNING: SlotContext name cannot change');
    invalidCache = true;
  }

  const cacheData = props.cache && !invalidCache && cacheRef.current === props.value ? props.cache : undefined;
  const context = useSlotContext();
  const newContext = useMemo(
    () => (props.name ? { ...context, [props.name]: props.value || '' } : context),
    [...(props.dependencies || (props.value ? [props.value] : []))]
  );
  const { data } = useSlotData(
    { loader: props.loader },
    {
      slots: props.slots,
      context: newContext,
      cacheData,
    }
  );

  const children = data && data.isEmpty ? props.fallback || props.children : props.children;

  let provider = props.name ? (
    <SlotReactContext.Provider value={newContext}>
      <SlotContextValue name={props.name} value={props.value}>
        {children}
      </SlotContextValue>
    </SlotReactContext.Provider>
  ) : (
    children || null
  );

  if (props.slots) {
    provider = <VisibleSlots.Provider value={props.slots}>{provider}</VisibleSlots.Provider>;
  }

  if (data) {
    provider = <SlotCache.Provider value={{ value: data, context: newContext }}>{provider}</SlotCache.Provider>;
  }

  return provider as any;
}
