import { BlockConfig, blockSymbol, DirectoryOptions, NestedSlotDocument, SlotResponse } from '../../core';
import { Children, cloneElement, ComponentType, isValidElement, useMemo } from 'react';
import { RenderBlock, RenderBlockProps } from './render-block';

export interface RenderSlotTreeProps {
  name: string;
  slot?: SlotResponse | NestedSlotDocument;
  context: Record<string, string>;
  options: DirectoryOptions<any, any>;
  metadata?: Record<string, BlockConfig>;
  parent?: { blockId: string; slotId: string };
  slotHtmlProps?: any;
  children?: any;
  selectBlockRenderer?: (
    slot: SlotResponse | NestedSlotDocument,
    blockId: string
  ) => ComponentType<RenderBlockProps> | undefined;
}

export function RenderSlotTree(props: RenderSlotTreeProps) {
  const { slot, slotHtmlProps = {} } = props;
  const { className, ...htmlProps } = slotHtmlProps;
  const editorProps: any = {
    'slot-name': props.name,
    'slot-id': slot ? slot.id || props.name : props.parent ? props.name : undefined,
    'slot-parent-slot-id': props.parent?.slotId,
    'slot-parent-block-id': props.parent?.blockId,
    'slot-size': slot?.blocks.length || 0,
    ...htmlProps,
    class: className,
  };
  const fallback = useMemo(() => !slot && props.children
    ? Children.map(props.children, (child) => isValidElement(child)
      ? cloneElement(child, { ...(child.props || {}), context: props.context } as any)
      : child)
    : null, [props.children, props.context, slot]);

  if (!slot) {
    return <pb-slot key={`empty_${props.name}`} empty-slot={true} {...editorProps}>{fallback}</pb-slot>;
  }

  return (
    <pb-slot key={slot.id || props.name} {...editorProps}>
      {slot.blocks.map((block, index) => {
        const Component = props.options.blocks[block.type];
        if (!Component) {
          return <div key={block.id || index}>Missing block: {block.type}.</div>;
        }
        const config = props.metadata?.[block.type] || Component[blockSymbol];
        const innerSlots: Record<string, (htmlProps?: any) => any> = {};
        const names = config?.slots || Object.keys(block.slots || {});
        for (const name of names) {
          innerSlots[name] = (nextHtmlProps) => (
            <RenderSlotTree
              {...props}
              name={name}
              parent={{ slotId: slot.id || props.name, blockId: block.id }}
              slot={block.slots?.[name]}
              slotHtmlProps={nextHtmlProps}
            />
          );
        }
        const BlockRenderer = props.selectBlockRenderer?.(slot, block.id) || RenderBlock;
        return (
          <BlockRenderer
            key={block.id || index}
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
