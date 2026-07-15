import { RenderSlotTree, RenderSlotTreeProps } from './render-slot-tree';

export type RenderSlotProps = RenderSlotTreeProps;
export function RenderSlot(props: RenderSlotProps) {
  return <RenderSlotTree {...props} />;
}
