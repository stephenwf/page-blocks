import { DirectoryOptions } from '../core';
import { createRemoteLoader } from '../client';
import { SlotContext, SlotContextProps } from '../react-client';

export function createSlotContext(options: DirectoryOptions<any>) {
  const loader = createRemoteLoader(options);
  function CustomSlotContext(props: SlotContextProps) {
    return (
      <SlotContext loader={loader} options={options} {...props}>
        {props.children}
      </SlotContext>
    );
  }

  return {
    loader,
    SlotContext: CustomSlotContext,
  };
}
