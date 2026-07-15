'use client';
import { useMemo } from 'react';
import { BlockConfig, SlotResponse } from '../../core';
import '../web-components/pb-editor';
import { ZodForm } from './zod-form';
import { SlotInspectorTooltip } from './slot-inspector-tooltip';

interface BlockEditorProps {
  block: BlockConfig<any, any, any>;
  data: any;
  onChange: (data: any) => void;
  onPending?: (data: any) => void;
  onClose?: () => void;
  slotSource?: SlotResponse['source'];
  activeContext?: Record<string, string>;
}

export function BlockEditor({ block, data, onChange, onPending, onClose, slotSource, activeContext }: BlockEditorProps) {
  // Merge data and ui metadata so field labels/descriptions/custom renderers work
  const config = useMemo(() => {
    return { ...(block.data ?? {}), ...(block.ui ?? {}) };
  }, [block.data, block.ui]);

  return (
    <div className="be-wrapper">
      <div className="be-header">
        <div className="be-header-content">
          <span className="be-block-chip">{block.label}</span>
          <h2 className="be-title">Edit Properties</h2>
        </div>
        <div className="be-header-actions">
          <SlotInspectorTooltip source={slotSource} activeContext={activeContext} />
          {onClose ? (
            <button className="be-close-btn" onClick={onClose} aria-label="Close editor">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {!block.props ? (
        <div className="be-empty">
          <svg viewBox="0 -960 960 960" width="36" height="36" fill="currentColor">
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Z" />
          </svg>
          <p>This block has no configurable properties.</p>
        </div>
      ) : (
        <div className="be-body">
          <ZodForm
            schema={block.props}
            model={data ?? {}}
            config={config}
            onChangeModel={onPending}
            onSubmit={onChange}
          />
        </div>
      )}
    </div>
  );
}
