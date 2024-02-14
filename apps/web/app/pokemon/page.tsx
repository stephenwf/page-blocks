'use client';

import { BlockEditor } from '../blocks/block-editor.lazy';
import { Slot, SlotContext } from '../blocks/directory';

export default function PokemonPage() {
  return (
    <SlotContext name="test-a" value="value-1">
      <SlotContext name="test-b" value="value-2">
        <SlotContext name="test-c" value="value-3">
          <div>Testing</div>

          <Slot name="test-slot" />

          <BlockEditor showToggle />
        </SlotContext>
      </SlotContext>
    </SlotContext>
  );
}
