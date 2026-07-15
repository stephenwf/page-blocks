
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pb-slot': PBSlotAttributes;
      'pb-editor': PBEditorAttributes;
      'pb-block': PBBlockAttributes;
      'pb-slot-context': PBSlotContextAttributes;
    }
  }
}

type JSXChildren = any; // JSX.Element is possible, but this will maximize compatibility

/**
 * Editor component
 *
 * This may be different per implementation. This is enough to avoid React/JSX complaining.
 */
export interface PBEditorAttributes {
  ref?: any;
  children?: JSXChildren;
}

export interface PBSlotAttributes {
  id?: string;
  ref?: any;
  children?: JSXChildren;

  // Attributes specific to the slot WC.
  'slot-id'?: string;
  'empty-slot'?: boolean;
  'slot-parent-slot-id'?: string;
  'slot-parent-block-id'?: string;

  // Properties
  context?: Record<string, string>;
  emptySlot?: boolean;
}

export interface PBBlockAttributes {
  id?: string;
  ref?: any;
  children?: JSXChildren;

  // Attributes specific to the block WC.
  'block-id': string;
  editing?: boolean;

  // Properties
  props?: Record<string, any>;
  context?: Record<string, string>;
  parentBlock?: { blockId: string; slotId: string } | null;
}

export interface PBSlotContextAttributes {
  ref?: any;
  children?: any;

  context?: Record<string, string>;
  'context-name': string;
  'context-value'?: string;
}

