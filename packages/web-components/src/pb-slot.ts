import { currentlyAddingBlock, editingMode, register, SlotEditingClient } from '@page-blocks/client';
import { el, pageContext } from './utils';
import { CreateSlot } from '@page-blocks/core';
import { ContextEvent } from './context';

register(
  'pb-slot',
  () =>
    class PbSlot extends HTMLElement {
      context: any = null;
      _slotOptions: any | null = null;
      _blocks: Set<any> = new Set();
      emptySlot = false;
      constructor() {
        super();

        if (!this.shadowRoot) {
          this.attachShadow({ mode: 'open' });
        }

        this.addEventListener('@slot/register-block' as any, (e: CustomEvent) => {
          if (e.defaultPrevented) return;
          e.stopPropagation();
          e.preventDefault();
          e.stopImmediatePropagation();
          this.registerBlock(e.target);
        });

        this.render();

        editingMode.listen(() => {
          this.render();
        });
      }

      get _parent() {
        const parentSlotId = this.attributes.getNamedItem('slot-parent-slot-id')?.value;
        const parentBlockId = this.attributes.getNamedItem('slot-parent-block-id')?.value;
        if (parentSlotId && parentBlockId) {
          return { slotId: parentSlotId, blockId: parentBlockId };
        }
        return null;
      }

      getClient(): SlotEditingClient | null {
        this.updateContext();
        const editor = document.querySelector('pb-editor');
        if (editor) {
          return (editor as any).client;
        }
        return null;
      }

      render() {
        this.updateContext();
        const isEditing = editingMode.get();

        const $slot = el('slot', {}, {}, []);
        if (!$slot) return;

        if (!isEditing) {
          this.shadowRoot!.innerHTML = '';
          this.shadowRoot!.appendChild($slot);
          return;
        }

        const isNew = !this.slotId && !this.parentSlot;
        if (isNew) {
          const $newElement = el('div', { part: 'slot-bar' }, {}, [
            el('div', { part: 'slot-label' }, {}, [this.slotName]),
            el('div', { part: 'controls' }, {}, [
              el('button', { part: 'control control-primary' }, { click: this.customiseSlot }, ['Customise']),
            ]),
          ])!;

          this.shadowRoot!.innerHTML = '';
          this.shadowRoot!.appendChild($newElement);
          this.shadowRoot!.appendChild($slot);
          return;
        }

        const $slotBar = el('div', { part: 'slot-bar' }, {}, [
          el('div', { part: 'slot-label' }, {}, [this.slotName]),
          el('div', { part: 'controls' }, {}, [
            el('button', { part: 'control control-primary' }, { click: this.addBlock }, ['Add']),
            el('button', { part: 'control control-delete' }, { click: this.resetSlot }, [
              el('svg', { height: '18', viewBox: '0 -960 960 960', width: '18' }, {}, [
                el(
                  'path',

                  {
                    d: 'M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z',
                  },
                  {},
                  []
                ),
              ]),
            ]),
          ]),
        ])!;

        this.shadowRoot!.innerHTML = '';
        this.shadowRoot!.appendChild($slotBar);
        this.shadowRoot!.appendChild($slot);
      }

      resetSlot = () => {
        const confirmed = confirm('Are you sure you want to reset this slot?');
        if (this.parentSlot || !confirmed) {
          return;
        }
        const client = this.getClient();
        if (client) {
          client.deleteSlot(this.slotId!);
        }
      };

      customiseSlot = () => {
        const client = this.getClient();
        if (client) {
          const context = this.context || {};
          const contextKeys: CreateSlot['matches'] = Object.keys(context).map((key) => ({
            id: key,
            value: context[key],
            type: 'exact',
          }));

          client.createSlot(this.slotName, contextKeys);
        }
        // @todo implement
      };

      addBlock = () => {
        if (this.slotId || this._parent) {
          currentlyAddingBlock.set({
            slotId: this.slotId || this.slotName,
            parent: this._parent,
          });
        }
      };

      get slotName() {
        return this.getAttribute('slot-name') || 'Untitled slot';
      }

      get parentSlot() {
        if (this._parent) {
          return document.querySelector(`pb-slot[slot-id="${this._parent.slotId}"]`);
        }
        return null;
      }

      get parentBlock() {
        if (this._parent) {
          return document.querySelector(
            `pb-slot[slot-id="${this._parent.slotId}"] > pb-block[block-id="${this._parent.blockId}"]`
          );
        }
        return null;
      }

      get slotOptions() {
        return this._slotOptions;
      }

      set slotOptions(options: any) {
        this._slotOptions = options;
        for (const block of this._blocks) {
          block.slotOptions = options;
        }
      }

      registerBlock(element: any) {
        element.slotId = this.slotId || this.slotName;
        element.slotOptions = this.slotOptions;
        this._blocks.add(element);
      }

      get slotId() {
        return this.attributes.getNamedItem('slot-id')?.value;
      }

      updateContext() {
        // Contexts above.
        this.dispatchEvent(
          new ContextEvent(pageContext, (newContext) => {
            this.context = Object.assign(newContext, this.context || {});
          })
        );
      }

      connectedCallback() {
        if (!this.shadowRoot) return;

        const blocks = Array.from(this.shadowRoot.querySelectorAll('pb-block'));
        for (const block of blocks) {
          this.registerBlock(block);
        }

        this.updateContext();

        this.render();
      }
    }
);
