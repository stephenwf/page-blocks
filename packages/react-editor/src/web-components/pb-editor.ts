import { createRoot, Root } from 'react-dom/client';
import { blockSymbol, DirectoryOptions } from '@page-blocks/core';
import { QueryClient } from 'react-query';
import {
  createSlotEditingClient,
  currentBlock,
  currentlyAddingBlock,
  editingMode,
  pendingBlockProps,
  register,
  SlotEditingClient,
} from '@page-blocks/client';
import { createElement } from 'react';
import { BlockEditorWrapper } from '../components/block-editor-wrapper';
import { AddBlockToSlot } from '../components/add-block-to-slot';
import '@page-blocks/client';

register(
  'pb-editor',
  () =>
    class PBEditor extends HTMLElement {
      editingReactRoot: Root | null = null;
      container: HTMLDivElement;
      editingContainer: HTMLDivElement;
      addingContainer: HTMLDivElement;
      addingReactRoot: Root | null = null;
      #options: DirectoryOptions<any> | null = null;
      queryClient: QueryClient | null = null;
      isMounted = false;
      onRefresh = () => {};

      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.container = document.createElement('div');
        this.editingContainer = document.createElement('div');
        this.addingContainer = document.createElement('div');
        this.container.appendChild(this.editingContainer);
        this.container.appendChild(this.addingContainer);
        this.container.className = 'block-container';
      }

      client: SlotEditingClient | null = null;

      set options(options: DirectoryOptions<any>) {
        this.#options = options;
        this.client = createSlotEditingClient(options, { onMutation: this.onMutation });
      }

      get options() {
        return this.#options!;
      }

      mount() {
        if (!this.isMounted) {
          this.isMounted = true;
          this.appendChild(this.container);
        }
      }

      connectedCallback() {
        editingMode.listen((isEditing) => {
          if (isEditing) {
            document.body.classList.add('pb-editing');
          } else {
            document.body.classList.remove('pb-editing');
            if (this.isMounted) {
              this.container.remove();
              this.isMounted = false;
              if (this.addingReactRoot) {
                this.addingReactRoot.unmount();
                this.addingReactRoot = null as any;
                this.addingContainer.className = '';
              }
              if (this.editingReactRoot) {
                this.editingReactRoot.unmount();
                this.editingReactRoot = null as any;
                this.editingContainer.className = '';
              }
            }
          }
        });

        currentlyAddingBlock.listen((adding) => {
          if (!this.client) {
            console.error('Editor not configured correctly. queryClient and options must be set.');
            return;
          }
          if (adding) {
            if (!this.addingReactRoot) {
              this.addingReactRoot = createRoot(this.addingContainer);
              // this.addingContainer.className = this.containerClassName;
              this.mount();
            }
            this.addingReactRoot.render(
              // @todo context is missing? Do we need to get this from the "add" ?
              createElement(AddBlockToSlot as any, {
                slot: adding,
                options: this.options,
                client: this.client,
              })
            );
          } else if (this.addingReactRoot) {
            this.addingReactRoot.unmount();
            this.addingReactRoot = null as any;
            this.addingContainer.className = '';
          }
        });

        // This components might be added at any point to the DOM. It needs to discover the slots that
        // have been added to the page (which contain information about their blocks).
        //
        // To do this, the component will both listen to slots advertising themselves, and also
        // send a message to all slots telling them to re-advertise themselves.
        //
        // The editor may also "Refresh" the slots on the page, which will cause them to re-advertise.
        //
        // The editor will then build a list of all the slots on the page, and their blocks.
        //
        // The editor will be constructed with enough information to make API requests to a configured API, which
        // will be local by default and for this implementation.
        currentBlock.listen((mode) => {
          if (!this.options || !this.queryClient || !this.client) {
            console.error('Editor not configured correctly. queryClient and options must be set.');
            return;
          }

          if (mode) {
            const slotId = mode.slotId;
            const blockId = mode.blockId;

            this.client.getSlot(slotId).then((slot) => {
              const editingBlock = slot.blocks.find((b: any) => b.id === blockId);
              if (!editingBlock) {
                return;
              }

              if (!this.editingReactRoot) {
                this.editingReactRoot = createRoot(this.editingContainer);
                this.editingContainer.className = 'block-edit-container';
                this.mount();
              }
              const blockComponent = this.options!.blocks[mode.blockType];
              const blockConfig = blockComponent[blockSymbol];

              pendingBlockProps.set(editingBlock.data);

              this.editingReactRoot.render(
                createElement(BlockEditorWrapper as any, {
                  ...mode,
                  client: this.client,
                  blockConfig,
                  data: editingBlock.data,
                })
              );
            });
          } else if (this.editingReactRoot) {
            this.editingReactRoot.unmount();
            this.editingReactRoot = null as any;
            this.editingContainer.className = '';
          }
        });

        this.shadowRoot!.innerHTML = `<slot></slot>`;
      }

      onMutation = (req: any, res: any) => {
        document.dispatchEvent(new CustomEvent('@page-blocks/mutation', { detail: { req, res } }));
        if (this.onRefresh) {
          this.onRefresh();
        }
      };
    }
);
