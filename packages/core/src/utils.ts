import { TypeOf, ZodTypeAny } from 'zod';

export type Prettify<T> = { [K in keyof T]: T[K] } & unknown;

export type MappedProps<Props extends ZodTypeAny = ZodTypeAny> = {
  [key in keyof TypeOf<Props>]?: MappedProp<TypeOf<Props>[key], any>;
};

export type MappedProp<Prop, Value = Prop> = {
  label?: string;
  description?: string;
  renderEditor?: (value: Value, onChange: (value: Value) => void) => any;
};

export type ComputeRaw<A extends any> = A extends Function ? A : { [K in keyof A]: A[K] } & unknown;
