import { TypeOf, ZodTypeAny } from 'zod';
import { PropSource } from '../core';

export function propSource<Response = any, Props extends ZodTypeAny = ZodTypeAny, DataProps = TypeOf<Props>>(
  props: Props,
  source: PropSource<DataProps, Response>
) {
  return source;
}
