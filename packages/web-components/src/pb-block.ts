import { SlotEditingClient, currentBlock, currentBlockId, editingMode } from '@page-blocks/client';
import { register } from '@page-blocks/client';
import { ContextEvent } from './context';
import { el, pageContext } from './utils';

register(
  'pb-block',
  () =>
    class PbBlock extends HTMLElement {
      #props: any = null;
      context: any = null;
      slotId: string | null = null;
      parentBlock: { slotId: string; blockId: string } | null = null;
      blockStylesheet: string | null = null;
      editing = false;

      constructor() {
        super();

        if (!this.shadowRoot) {
          this.attachShadow({ mode: 'open' });
        }

        this.render();

        editingMode.listen(() => {
          this.render();
        });

        currentBlockId.listen((value) => {
          if (value.blockId === this.blockId && value.slotId === this.slotId) {
            this.setAttribute('editing', 'true');
          } else if (this.hasAttribute('editing')) {
            this.removeAttribute('editing');
          }
        });
      }

      updateContext() {
        // Contexts above.
        this.dispatchEvent(
          new ContextEvent(pageContext, (newContext) => {
            this.context = Object.assign(newContext, this.context || {});
          })
        );
      }

      getClient(): SlotEditingClient | null {
        this.updateContext();
        this.registerSelf();
        const editor = document.querySelector('pb-editor');
        if (editor) {
          return (editor as any).client;
        }
        return null;
      }

      render() {
        this.updateContext();
        // const styles = this.getStyles();
        const isEditing = editingMode.get();
        if (!isEditing) {
          this.shadowRoot!.innerHTML = '<slot></slot>';
          return;
        }

        const $editBar = el('div', { part: 'edit-bar' }, {}, [
          el('div', { part: 'label' }, {}, [this.blockType || 'Untitled Block']),
          el('div', { part: 'controls' }, {}, [
            el('button', { part: 'control' }, { click: this.editBlock }, ['Edit']),
            el('button', { part: 'control control-svg' }, { click: this.moveUp }, [
              el('svg', { height: '18', viewBox: '0 -960 960 960', width: '18' }, {}, [
                el(
                  'path',
                  {
                    d: 'M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z',
                  },
                  {},
                  []
                ),
              ]),
            ]),
            el('button', { part: 'control control-svg' }, { click: this.moveDown }, [
              el('svg', { height: '18', viewBox: '0 -960 960 960', width: '18' }, {}, [
                el(
                  'path',
                  {
                    d: 'M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z',
                  },
                  {},
                  []
                ),
              ]),
            ]),
            el('button', { part: 'control control-svg' }, { click: this.deleteBlock }, [
              el('svg', { height: '18', viewBox: '0 -960 960 960', width: '18' }, {}, [
                el(
                  'path',
                  {
                    fill: 'currentColor',
                    d: 'M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z',
                  },
                  {},
                  []
                ),
              ]),
            ]),
          ]),
        ]);

        const $slot = el('slot', {}, {}, []);

        this.shadowRoot!.innerHTML = '';
        if ($editBar && $slot) {
          this.shadowRoot!.appendChild($editBar);
          this.shadowRoot!.appendChild($slot);
        }
      }

      deleteBlock = () => {
        this.updateContext();
        this.registerSelf();
        const confirm = window.confirm('Are you sure you want to delete this block?');
        const client = this.getClient();
        if (!confirm || !this.slotId || !this.blockId || !client) {
          return;
        }

        client.deleteBlock(this.slotId, this.blockId, this.parentBlock || undefined);
      };

      moveUp = () => {
        this.updateContext();
        this.registerSelf();
        if (this.slotId && this.blockId) {
          this.getClient()?.moveBlockUp(this.slotId, this.blockId, this.parentBlock || undefined);
        }
      };
      moveDown = () => {
        this.updateContext();
        this.registerSelf();
        if (this.slotId && this.blockId) {
          this.getClient()?.moveBlockDown(this.slotId, this.blockId, this.parentBlock || undefined);
        }
      };

      editBlock = () => {
        this.updateContext();
        this.registerSelf();
        this.setAttribute('editing', 'true');
        currentBlock.set({
          blockId: this.blockId!,
          blockType: this.blockType!,
          slotId: this.slotId!,
          parent: this.parentBlock,
          props: this.props,
          context: this.context,
        });
      };

      registerSelf() {
        this.dispatchEvent(
          new CustomEvent('@slot/register-block', {
            detail: { testing: 'this block' },
            bubbles: true,
            composed: true,
            cancelable: true,
          })
        );
      }

      connectedCallback() {
        if (!this.shadowRoot) return;
        this.dispatchEvent(new CustomEvent('@slot/request-context', {}));
        // this.style.viewTransitionName = `pb_${this.blockId}_${this.slotId}`;
        this.render();
        this.registerSelf();
      }

      get blockId() {
        return this.attributes.getNamedItem('block-id')?.value;
      }

      get blockType() {
        return this.attributes.getNamedItem('block-type')?.value;
      }

      set props(value: any) {
        this.#props = value;
      }

      get props() {
        return this.#props;
      }

      observedAttributes() {
        return ['block-id'];
      }
    }
);
