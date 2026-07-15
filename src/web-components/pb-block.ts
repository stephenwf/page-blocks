import { SlotEditingClient, currentBlock, currentBlockId, editingMode } from '../client';
import { register } from '../client';
import { ContextEvent } from './context';
import { el, pageContext } from './utils';
import { mergePageBlocksContext } from '../vite/runtime';

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

        this.addEventListener('parent-block-request', (event: any) => {
          if (event.target === this) return;
          event.stopPropagation();

          if (event.detail.callback) {
            if (!this.slotId) {
              this.registerSelf();
            }

            event.detail.callback({
              slotId: this.slotId,
              blockId: this.blockId,
            });
          }
        });

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
        this.context = mergePageBlocksContext();
        this.dispatchEvent(
          new ContextEvent(pageContext, (newContext) => {
            this.context = mergePageBlocksContext(this.context || {}, newContext);
          })
        );
        this.dispatchEvent(
          new CustomEvent('parent-block-request', {
            bubbles: true,
            detail: {
              callback: (parentBlock: any) => {
                this.parentBlock = parentBlock;
              },
            },
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

      /** Create a Material Symbols SVG path element */
      #svgIcon(pathD: string): SVGElement | null {
        const svg = el('svg', { height: '14', viewBox: '0 -960 960 960', width: '14', fill: 'currentColor' }, {}, [
          el('path', { d: pathD, fill: 'currentColor' }, {}, []),
        ]);
        return svg as SVGElement | null;
      }

      render() {
        this.updateContext();
        const isEditing = editingMode.get();

        if (!isEditing) {
          this.shadowRoot!.innerHTML = '<slot></slot>';
          return;
        }

        const label = this.blockType || 'Block';

        // ── Edit button ────────────────────────────────────────────────────
        const $editBtn = el('button', { part: 'control' }, { click: this.editBlock }, [
          this.#svgIcon(
            'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z'
          )!,
          'Edit',
        ])!;

        // ── Move up button ─────────────────────────────────────────────────
        const $upBtn = el('button', { part: 'control control-svg', title: 'Move up' }, { click: this.moveUp }, [
          this.#svgIcon('M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z')!,
        ])!;

        // ── Move down button ───────────────────────────────────────────────
        const $downBtn = el('button', { part: 'control control-svg', title: 'Move down' }, { click: this.moveDown }, [
          this.#svgIcon('M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z')!,
        ])!;

        // ── Delete button ──────────────────────────────────────────────────
        const $deleteBtn = el(
          'button',
          { part: 'control control-svg', title: 'Delete block' },
          { click: this.deleteBlock },
          [
            this.#svgIcon(
              'M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z'
            )!,
          ]
        )!;

        // ── Assemble edit bar ──────────────────────────────────────────────
        const $editBar = el('div', { part: 'edit-bar' }, {}, [
          el('div', { part: 'label' }, {}, [label]),
          el('div', { part: 'controls' }, {}, [$editBtn, $upBtn, $downBtn, $deleteBtn]),
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
