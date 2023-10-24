import { TypeOf, ZodTypeAny } from 'zod';
import { MappedProps, Prettify } from './utils';
import { PropSource } from './prop-source';
import { ContextSource } from './context-source';

type InnerSlotConfig = {
  label?: string;
  description?: string;
  minItems?: number;
  maxItems?: number;
};

export type BlockConfig<
  Props extends ZodTypeAny = ZodTypeAny,
  DataProps = TypeOf<Props>,
  Preload extends Record<string, any> = Record<string, never>,
  InnerSlots extends string = never,
  RequiredCtx extends string = never,
  OptionalCtx extends string = never,
  ComponentType = any,
> = {
  label: string;
  description?: string;
  props?: Props;
  preload?: (props: Prettify<TypeOf<Props>>, serverContext: any) => Promise<Preload>;
  data?: Prettify<MappedProps<Props>>;
  ui?: Prettify<MappedProps<Props>>;
  groups?: Array<{
    label: string;
    type: 'data' | 'ui' | 'tab';
    props: Array<keyof TypeOf<Props>>;
  }>;
  hideTabs?: ['data' | 'ui'];
  requiredContext?: Array<RequiredCtx>;
  optionalContext?: Array<OptionalCtx>;
  propSources?: Array<PropSource<TypeOf<Props>>>;
  contextSources?: Array<ContextSource<Prettify<Record<RequiredCtx, string> & Partial<Record<OptionalCtx, string>>>>>;
  slots?: Array<InnerSlots>;
  slotConfig?: Prettify<Record<InnerSlots, InnerSlotConfig>>;
  mapToProps?: (props: DataProps) => TypeOf<Props>;
  mapFromProps?: (props: TypeOf<Props>) => DataProps;
  examples?: Array<{
    label: string;
    preset?: boolean;
    display?: { width?: number };
    props: TypeOf<Props>;
    context: Prettify<Record<RequiredCtx, string> & Partial<Record<OptionalCtx, string>>>;
    slots?: Record<InnerSlots, ComponentType>;
  }>;
  blockStylesheet?: string;
};
