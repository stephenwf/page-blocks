import { register } from '@page-blocks/client';
import { ContextEvent } from './context';
import { pageContext } from './utils';

register(
  'pb-slot-context',
  () =>
    class PbSlotContext extends HTMLElement {
      _context: any = null;

      constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.addEventListener('context-request', (event) => {
          event.stopPropagation();
          if (event.target === this) return;
          // If the callback throws, propagation is already stopped
          event.callback(this.context || {});
        });
      }

      distributeContext() {
        const slots = Array.from(this.querySelectorAll('pb-slot')) as any[];
        const blocks = Array.from(this.querySelectorAll('pb-block')) as any[];
        for (const slot of slots) {
          slot.context = this._context;
        }
        for (const block of blocks) {
          block.context = this._context;
        }
      }

      refreshContext() {
        const name = this.getAttribute('context-name');
        const value = this.getAttribute('context-value');
        if (name) {
          // Walk up parent elements and find the first one that has a context
          const fullContext: any = { [name]: value };
          let parent = this.parentElement;
          while (parent) {
            if ((parent as any).context) {
              Object.assign(fullContext, (parent as any).context);
            }
            parent = parent.parentElement;
          }

          this._context = fullContext;
        }
      }

      get context() {
        this.refreshContext();
        return this._context;
      }

      connectedCallback() {
        if (!this.shadowRoot) return;

        const name = this.getAttribute('context-name');
        const value = this.getAttribute('context-value');
        if (name) {
          // Walk up parent elements and find the first one that has a context
          const fullContext: any = { [name]: value };
          let parent = this.parentElement;
          while (parent) {
            if ((parent as any).context) {
              Object.assign(fullContext, (parent as any).context);
            }
            parent = parent.parentElement;
          }

          this._context = fullContext;
        }

        this.refreshContext();

        this.shadowRoot!.innerHTML = `<slot></slot>`;
      }
    }
);
