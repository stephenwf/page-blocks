import { CustomSlot } from '@page-blocks/react';
import type { FC } from 'react';
import { fileSystemLoader } from './server';
import { directory } from './directory';

interface SlotProps {
  context: Record<string, string>;
  name: string;
  children?: React.ReactNode;
  class?: string;
}

export const Slot = (async (props: SlotProps) => {
  const { name, context, children, ...htmlProps } = props;
  const slotResponse = await fileSystemLoader.query(context, [name]);
  const options = { resolver: directory.resolver, blocks: directory.blocks };

  return (
    <CustomSlot
      name={name}
      slot={slotResponse.slots[name]}
      context={context}
      options={options}
      slotHtmlProps={htmlProps}
    >
      {children}
    </CustomSlot>
  );
}) as any as FC<SlotProps>;
