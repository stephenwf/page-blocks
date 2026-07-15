'use client';

import { useStore } from '@nanostores/react';
import { currentBlockId } from '../client';
import { RenderSlotTree, RenderSlotTreeProps } from '../react/components/render-slot-tree';
import { RenderPreviewBlock } from './render-preview-block';

export type RenderClientSlotProps = RenderSlotTreeProps;
export function RenderClientSlot(props: RenderClientSlotProps) {
  const current = useStore(currentBlockId);
  return (
    <RenderSlotTree
      {...props}
      selectBlockRenderer={(slot, blockId) =>
        current.slotId === slot.id && current.blockId === blockId ? RenderPreviewBlock : undefined
      }
    />
  );
}
