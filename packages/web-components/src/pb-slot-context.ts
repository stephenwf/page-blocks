import { register } from '@page-blocks/client';
import { ContextEvent } from './context';
import { pageContext } from './utils';

register(
  'pb-slot-context',
  () =>
    class PbSlotContext extends HTMLElement {
      context: any = null;
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.addEventListener('context-request', (event) => {
          event.stopPropagation();
          if (event.target === this) return;
          // If the callback throws, propagation is already stopped
          event.callback(this.context || {});
        });

        const slots = Array.from(this.querySelectorAll('pb-slot')) as any[];
        const blocks = Array.from(this.querySelectorAll('pb-block')) as any[];
        for (const slot of slots) {
          slot.context = this.context;
        }
        for (const block of blocks) {
          block.context = this.context;
        }
      }

      connectedCallback() {
        if (!this.shadowRoot) return;

        const name = this.getAttribute('context-name');
        const value = this.getAttribute('context-value');
        if (name) {
          this.context = Object.assign(this.context || {}, {
            [name]: value,
          });
        }

        // Contexts above.
        this.dispatchEvent(
          new ContextEvent(pageContext, (newContext) => {
            this.context = Object.assign(newContext || {}, this.context || {});
          })
        );

        this.shadowRoot!.innerHTML = `<slot></slot>`;
      }
    }
);
