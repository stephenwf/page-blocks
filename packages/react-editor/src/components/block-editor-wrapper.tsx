import { useStore } from '@nanostores/react';
import { currentBlock, pendingBlockProps, SlotEditingClient } from '@page-blocks/client';
import { BlockEditor } from './block-editor';

export function BlockEditorWrapper({
  client,
  ...props
}: {
  client: SlotEditingClient;
  slotId: string;
  blockId: string;
  blockConfig: any;
  data: any;
}) {
  const current = useStore(currentBlock);
  if ((!props.slotId && !current?.parent) || !current) {
    // This could be new slot?
    return <div className="block-edit__not-found">COULD NOT FIND SLOT ID</div>;
  }

  return (
    <>
      {props.blockConfig ? (
        <BlockEditor
          key={props.blockId + '@@' + props.slotId}
          block={props.blockConfig}
          data={props.data || {}}
          onClose={() => {
            pendingBlockProps.set(undefined);
            currentBlock.set(undefined);
          }}
          onPending={(e) => {
            pendingBlockProps.set(e);
          }}
          onChange={(e) => {
            pendingBlockProps.set(e);
            client.updateBlockProps(props.slotId, props.blockId, e, current.parent || undefined).then(() => {
              currentBlock.set(undefined);
              pendingBlockProps.set(undefined);
            });
          }}
        />
      ) : null}
    </>
  );
}
