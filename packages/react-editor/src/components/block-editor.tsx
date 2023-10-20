'use client';
import ZodBridge from 'uniforms-bridge-zod';
import { useMemo } from 'react';
import uniforms from 'uniforms-semantic';
import { BlockConfig } from '@page-blocks/core';
import '../web-components/pb-editor';

interface BlockEditorProps {
  block: BlockConfig<any, any, any>;
  data: any;
  onChange: (data: any) => void;
  onPending?: (data: any) => void;
  onClose?: () => void;
}

const AutoForm = uniforms.AutoForm;

export function BlockEditor(props: BlockEditorProps) {
  const block = props.block;
  const data = props.data;

  const bridge = useMemo(() => {
    return new ZodBridge({ schema: block.props });
  }, [block.props]);

  return (
    <>
      <div className="block-edit">
        <h1 className="block-edit__title">Edit Block</h1>
        {props.onClose ? (
          <button className="block-edit__close" onClick={props.onClose}>
            <svg
              className="block-edit__close-icon"
              xmlns="http://www.w3.org/2000/svg"
              height="24"
              viewBox="0 -960 960 960"
              width="24"
              stroke="currentColor"
            >
              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
            </svg>
          </button>
        ) : null}
      </div>

      <AutoForm schema={bridge} model={data} onChangeModel={props.onPending} onSubmit={props.onChange} />
    </>
  );
}
