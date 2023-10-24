import { BlockConfig, blockSymbol, DirectoryOptions } from '@page-blocks/core';
import { currentBlock, currentlyAddingBlock, SlotEditingClient } from '@page-blocks/client';
import { useState } from 'react';
import { Tabs } from './tabs';
import { SourceSearch } from './source-search';
import { QueryClient, QueryClientProvider } from 'react-query';

function generateId() {
  return Math.random().toString(36).substring(7);
}

function AddBlockContainer(props: {
  title: string;
  screens?: () => Promise<void>;
  children: any;
  onClose: () => void;
}) {
  const [isGeneratingScreenshots, setIsGeneratingScreenshots] = useState(false);
  const [lastScreenshotRefresh, setLastScreenshotRefresh] = useState(Date.now());
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
            <div className="block-add__background-again" key={lastScreenshotRefresh}>
              <div className="block-add__actions">
                {props.screens ? (
                  <button
                    disabled={isGeneratingScreenshots}
                    className="block-add__gen-screens"
                    onClick={() => {
                      if (props.screens) {
                        setIsGeneratingScreenshots(true);
                        props.screens().then(() => {
                          setIsGeneratingScreenshots(false);
                          setLastScreenshotRefresh(Date.now());
                        });
                      }
                    }}
                  >
                    Generate screenshots
                  </button>
                ) : null}
                <button className="block-add__close" onClick={props.onClose}>
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
              <h1 className="block-add__title">{props.title}</h1>
              {props.children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type NotUndefined<T> = T extends undefined ? never : T;
type Example = NotUndefined<BlockConfig['examples']>[number];

export function AddBlockToSlotInner(props: {
  slot: { slotId: string; parent?: any };
  options: DirectoryOptions<any, any>;
  context?: any;
  client: SlotEditingClient;
}) {
  const blocks = props.options.blocks;
  const blockTypes = Object.keys(blocks);
  const screens = props.options.resolver.screenshots || null;
  const screenRefresh = screens ? props.client.generateScreenshots : undefined;
  const [chosenBlock, setChosenBlock] = useState<string | undefined>(undefined);

  const handleChoose = (type: string, config: BlockConfig) => {
    if ((config.propSources && config.propSources.length) || (config.examples && config.examples.length > 1)) {
      setChosenBlock(type);
    } else {
      const first = config.examples?.[0];
      handleAdd(type, first || { label: type, props: {}, context: {} });
    }
  };

  const handleAdd = (type: string, example: Example) => {
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

  if (chosenBlock) {
    const config = blocks[chosenBlock][blockSymbol] as BlockConfig<any, any, any>;

    const tabs = [];
    if (config.propSources && config.propSources.length) {
      for (const source of config.propSources) {
        tabs.push({
          label: source.type,
          render: () => (
            <SourceSearch
              source={source}
              config={config}
              onAdd={(props) => handleAdd(chosenBlock, { label: source.type, props, context: {} })}
            />
          ),
        });
      }
    }
    if (config.examples && config.examples.length) {
      tabs.push({
        label: 'Examples',
        render: () => (
          <div className="block-add__grid">
            {config.examples!.map((example, k) => (
              <div onClick={() => handleAdd(chosenBlock, example)} className="block-add__block" key={k}>
                {screens ? (
                  <div className="block-add__thumbnail-container">
                    <img
                      src={`${screens}/${k === 0 ? chosenBlock : `${chosenBlock}-${k}`}.jpg`}
                      className="block-add__thumbnail"
                      alt=""
                    />
                  </div>
                ) : null}
                <div className="block-add__block-label">{example.label || config.label || chosenBlock}</div>
              </div>
            ))}
          </div>
        ),
      });
    }

    return (
      <AddBlockContainer
        title={`Add ${config.label || chosenBlock}`}
        onClose={() => setChosenBlock(undefined)}
        screens={screenRefresh}
      >
        <Tabs items={tabs} />
      </AddBlockContainer>
    );
  }

  return (
    <AddBlockContainer title="Add block" onClose={() => currentlyAddingBlock.set(undefined)} screens={screenRefresh}>
      <div className="block-add__grid">
        {blockTypes.map((type) => {
          const config = blocks[type][blockSymbol] as BlockConfig<any, any, any>;
          return (
            <div onClick={() => handleChoose(type, config)} className="block-add__block" key={type}>
              {screens ? (
                <div className="block-add__thumbnail-container">
                  <img src={`${screens}/${type}.jpg`} className="block-add__thumbnail" alt="" />
                </div>
              ) : null}
              <div className="block-add__block-label">{config.label || type}</div>
            </div>
          );
        })}
      </div>
    </AddBlockContainer>
  );
}

const client = new QueryClient();
export function AddBlockToSlot(props: any) {
  return (
    <QueryClientProvider client={client}>
      <AddBlockToSlotInner {...props} />
    </QueryClientProvider>
  );
}
