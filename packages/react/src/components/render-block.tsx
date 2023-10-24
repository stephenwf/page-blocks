import { BlockResponse } from '@page-blocks/core';

export interface RenderBlockProps {
  block: BlockResponse;
  Component: any;
  innerSlots: Record<string, any>;
  componentProps?: any;
  editing?: boolean;
  context: Record<string, string>;
  parent?: { blockId: string; slotId: string } | null;
}
export function RenderBlock(props: RenderBlockProps) {
  // const ref = useRef<PBBlockAttributes>(null);
  const { block, innerSlots = {}, Component, editing, parent } = props;
  const { context, ...componentProps } = props.componentProps || block.data || {};
  const blockContext = Object.assign({}, props.context || {}, context);

  const blockAttributes: any = {
    'block-type': block.type,
    'block-id': block.id,
    id: `pb-${block.id}`,
  } as const;

  if (editing) {
    blockAttributes.editing = true;
  }
  if (parent) {
    blockAttributes['parent-block-id'] = parent.blockId;
    blockAttributes['parent-slot-id'] = parent.slotId;
  }

  // useEffect(() => {
  //   if (ref.current) {
  //     // @todo Provide alternatives to this for non-React components.
  //     ref.current.parentBlock = parent;
  //     ref.current.props = componentProps || {};
  //     ref.current.context = props.context;
  //   }
  // }, [parent, componentProps, props.context]);

  return (
    <pb-block {...blockAttributes}>
      {/* This doesn't work yet due to React hydration on the server, but would allow for server-rendered block styles */}
      {/*<template shadowrootmode="open">*/}
      {/*  {blockStylesheet ? <style>{blockStylesheet}</style> : null}*/}
      {/*  <slot></slot>*/}
      {/*</template>*/}
      <Component {...(componentProps || {})} {...innerSlots} context={blockContext} />
    </pb-block>
  );
}
