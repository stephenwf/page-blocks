'use client';

import { HTMLAttributes, Suspense, useMemo } from 'react';
import { useSlotContext } from './context';
import { DirectoryOptions } from '@page-blocks/core';
import { ReactQuerySlot } from './react-query-slot';

export type SlotProps = {
  name: string;
  children?: React.ReactNode;
} & HTMLAttributes<'div'>;

export function Slot(props: SlotProps & HTMLAttributes<'div'> & { options: DirectoryOptions }) {
  const context = useSlotContext();
  const { slotHtmlProps, name, children } = useMemo(() => {
    const { children, className, name, ...rest } = props;
    return {
      slotHtmlProps: { ...rest, class: className },
      name,
      children,
    };
  }, [props]);

  return (
    <Suspense fallback={null}>
      <ReactQuerySlot context={context} options={props.options} name={name} slotHtmlProps={slotHtmlProps}>
        {children || null}
      </ReactQuerySlot>
    </Suspense>
  );
}
