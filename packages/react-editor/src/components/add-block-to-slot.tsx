import { BlockConfig, blockSymbol, DirectoryOptions } from '@page-blocks/core';
import { currentBlock, currentlyAddingBlock, SlotEditingClient } from '@page-blocks/client';
import { useState } from 'react';

function generateId() {
  return Math.random().toString(36).substring(7);
}

export function AddBlockToSlot(props: {
  slot: { slotId: string; parent?: any };
  options: DirectoryOptions<any, any>;
  context?: any;
  client: SlotEditingClient;
}) {
  const blocks = props.options.blocks;
  const blockTypes = Object.keys(blocks);
  const screens = props.options.resolver.screenshots || null;
  const [isGeneratingScreenshots, setIsGeneratingScreenshots] = useState(false);
  const [lastScreenshotRefresh, setLastScreenshotRefresh] = useState(Date.now());

  const handleAdd = (type: string, config: BlockConfig) => {
    const example = (config.examples || [])[0];
    if (example) {
      props.client
        .createBlock(
          props.slot.slotId,
          {
            id: generateId(),
            type,
            data: example.props,
          },
          props.slot.parent
        )
        .then((block: any) => {
          currentlyAddingBlock.set(undefined);
          if (block) {
            currentBlock.set({
              blockId: block.id,
              slotId: props.slot.slotId,
              props: block.data,
              parent: props.slot.parent,
              blockType: type,
              context: {},
            });
            setTimeout(() => {
              window.location.hash = `#pb-${block.id}`;
            }, 300);
          }
        });
    }
  };

  return (
    <div className="block-add" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div
        className="block-add__modal-bg"
        onClick={() => {
          currentlyAddingBlock.set(undefined);
        }}
      ></div>
      <div className="block-add__container">
        <div className="block-add__inner-container">
          <div className="block-add__background">
            <div className="block-add__background-again">
              <div className="block-add__actions">
                {screens ? (
                  <button
                    disabled={isGeneratingScreenshots}
                    className="block-add__gen-screens"
                    onClick={() => {
                      setIsGeneratingScreenshots(true);
                      props.client.generateScreenshots().then(() => {
                        setIsGeneratingScreenshots(false);
                        setLastScreenshotRefresh(Date.now());
                      });
                    }}
                  >
                    Generate screenshots
                  </button>
                ) : null}
                <button
                  className="block-add__close"
                  onClick={() => {
                    currentlyAddingBlock.set(undefined);
                  }}
                >
                  <svg
                    className="block-add__close-svg"
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    stroke="currentColor"
                  >
                    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                  </svg>
                </button>
              </div>

              <h1 className="block-add__title">Add Block</h1>
              <div className="block-add__grid">
                {blockTypes.map((type) => {
                  const config = blocks[type][blockSymbol] as BlockConfig<any, any, any>;
                  if (!config.examples || !config.examples.length) {
                    return null;
                  }
                  return (
                    <div onClick={() => handleAdd(type, config)} className="block-add__block" key={type}>
                      {screens ? (
                        <div className="block-add__thumbnail-container">
                          <img
                            src={`${screens}/${type}.jpg`}
                            className="block-add__thumbnail"
                            alt=""
                            key={lastScreenshotRefresh}
                          />
                        </div>
                      ) : null}
                      <div className="block-add__block-label">{config.label || type}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
