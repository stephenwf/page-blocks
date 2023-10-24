'use client';

import { BlockConfig, DirectoryOptions, SlotResponse } from '@page-blocks/core';
import { Children, cloneElement, isValidElement, useMemo } from 'react';
import { RenderClientBlock } from './render-client-block';
import { RenderPreviewBlock } from './render-preview-block';
import { currentBlockId } from '@page-blocks/client';
import { useStore } from '@nanostores/react';

export interface RenderClientSlotProps {
  name: string;
  slot?: SlotResponse;
  context: Record<string, string>;
  options: DirectoryOptions<any, any>;
  metadata?: Record<string, BlockConfig>;
  parent?: { blockId: string; slotId: string };
  slotHtmlProps?: any;
  children?: any;
}

export function RenderClientSlot(props: RenderClientSlotProps) {
  // const ref = useRef<PBSlotAttributes>(null);
  const current = useStore(currentBlockId);
  const isEditingSlot = current.slotId === props.slot?.id;
  const { slot, slotHtmlProps = {} } = props;
  const { className, ...propsToUse } = slotHtmlProps;
  const editorProps: any = {
    'slot-name': props.name,
    'slot-id': slot ? slot.id : props.parent ? props.name : undefined,
    'slot-parent-slot-id': props.parent?.slotId,
    'slot-parent-block-id': props.parent?.blockId,
    'slot-size': slot ? (slot.blocks || []).length : 0,
    ...propsToUse,
    class: className,
  };

  // Because we know that the children won't change (unless the block is edited, which is a non-critical path) we can
  // avoid creating layers of React context and instead just pass the context down to the children. We also want to
  // avoid the slot context mechanism being used for components that are deeper than the blocks, as this will cause
  // bugs and difficult to debug issues. It's easier when the blocks are customised, we can just pass the context
  // down when we render each block. This only applies to the hard-coded blocks.
  const defaultChildElements = useMemo(() => {
    return !slot && props.children
      ? Children.map(props.children, (child) => {
          if (isValidElement(child)) {
            return cloneElement(child, { ...(child.props || {}), context: props.context } as any);
          }
          return child;
        })
      : null;
  }, [props.children, props.context, slot]);

  // Passing down properties because React doesn't like Web Components.
  // useEffect(() => {
  //   if (ref.current) {
  //     // @todo provide alternatives to this for non-React components.
  //     ref.current.context = props.context;
  //     if (!slot) {
  //       // @todo pass empty slot template based on children properties.
  //       // ref.current.emptySlot = true;
  //     }
  //   }
  // }, [props.context, props.options, slot]);

  if (!slot) {
    // No slot, default to children
    // @todo pass empty slot template based on children properties.
    return (
      <pb-slot key={`empty_${props.name}`} empty-slot={true} {...editorProps}>
        {defaultChildElements}
      </pb-slot>
    );
  }

  const blocks = slot.blocks;
  const blocksById: any = props.options.blocks;
  const blocksConfig: any = props.metadata || {};

  return (
    <pb-slot key={slot.id} {...editorProps}>
      {blocks.map((block: any, k: number) => {
        const Component = blocksById[block.type];
        const metadata = blocksConfig[block.type];

        if (!Component) {
          // @todo make a way for this block to be removed by the user. Perhaps just by wrapping it in pb-block?
          return (
            <div key={k}>
              Missing block: {block.type}. (Available: {Object.keys(blocksById).join(', ')})
            </div>
          );
        }
        const innerSlots: any = {};
        const keys = metadata?.slots || Object.keys(block.slots || {}) || [];

        // This will render inner slots of blocks. Because we are doing this here it will change the order of the
        // rendering. First all the slots will be rendered, and then all the blocks within the slots. It's posible this
        // might cause issues. However, similar to the slot itself, we know that the inner slots won't change unless
        // the block is edited, or we change the context (e.g. page) which invalidates the whole tree anyway.
        for (const key of keys) {
          const foundSlot = (block.slots || {})[key];
          if (foundSlot) {
            innerSlots[key] = (
              <RenderClientSlot
                {...props}
                name={key}
                parent={{ slotId: slot.id, blockId: block.id }}
                slot={foundSlot}
              />
            );
          } else {
            // Empty slot?
            innerSlots[key] = (
              <RenderClientSlot
                {...props}
                name={key}
                parent={{ slotId: slot.id, blockId: block.id }}
                slot={undefined}
              />
            );
          }
        }

        // For performance reasons, the "RenderPreviewBlock" is only used when we know which block is being edited.
        // You could always use RenderPreviewBlock, but it will cause a lot of re-renders when you're editing a block.
        const RenderBlockComponent =
          isEditingSlot && current.blockId === block.id ? RenderPreviewBlock : RenderClientBlock;

        return (
          <RenderBlockComponent
            key={block.id || k}
            block={block}
            Component={Component}
            innerSlots={innerSlots}
            context={props.context}
            parent={props.parent}
          />
        );
      })}
    </pb-slot>
  );
}
