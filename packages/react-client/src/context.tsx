'use client';
import { createContext, useContext } from 'react';

export const SlotReactContext = createContext<Record<string, string>>({});

export const SlotCache = createContext<{ value: any; context: Record<string, string> } | null>(null);

export const VisibleSlots = createContext<string[]>([]);

export function useVisibleSlots() {
  return useContext(VisibleSlots);
}

export function useSlotContext() {
  return useContext(SlotReactContext);
}

export function useSlotCache() {
  return useContext(SlotCache);
}

export function useCurrentSlotCache() {
  const slotContext = useSlotContext();
  const cachedData = useSlotCache();
  return cachedData && contextMatches(cachedData.context, slotContext) ? cachedData.value : undefined;
}

export function contextMatches(a: Record<string, string>, b: Record<string, string>) {
  for (const key in a) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

export function SlotContextValue({ children, name, value }: { name: string; value?: string; children: any }) {
  return (
    <pb-slot-context context-name={name} context-value={value}>
      {children}
    </pb-slot-context>
  );
}

// export function SlotContext(props: {
//   children: any;
//   name?: string;
//   value?: string;
//   dependencies?: any[];
//   cache?: any;
//   editMode?: boolean;
// }) {
//   const cacheRef = useRef<any>();
//   const context = useSlotContext();
//   const newContext = useMemo(
//     () => (props.name && props.value ? { ...context, [props.name]: props.value } : context),
//     [...(props.dependencies || (props.value ? [props.value] : []))]
//   );
//
//   if (!cacheRef.current) {
//     cacheRef.current = props.value;
//   }
//
//   let provider = props.name ? (
//     <SlotReactContext.Provider value={newContext}>
//       <SlotContextValue name={props.name} value={props.value}>
//         {props.children}
//       </SlotContextValue>
//     </SlotReactContext.Provider>
//   ) : (
//     props.children || null
//   );
//
//   if (props.cache && cacheRef.current === props.value) {
//     provider = <SlotCache.Provider value={{ value: props.cache, context: newContext }}>{provider}</SlotCache.Provider>;
//   }
//
//   return provider as any;
// }
