import { DirectoryOptions } from '@page-blocks/core';
import { createRemoteLoader } from '@page-blocks/client';
import { SlotContext, SlotContextProps } from '@page-blocks/react-client';

export function createSlotContext(options: DirectoryOptions<any>) {
  const loader = createRemoteLoader(options);
  function CustomSlotContext(props: SlotContextProps) {
    return <SlotContext loader={loader} options={options} {...props} />;
  }

  return {
    loader,
    SlotContext: CustomSlotContext,
  };
}
