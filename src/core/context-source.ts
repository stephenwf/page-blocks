export interface ContextSource<Context = any> {
  type: string;
  url: string;
  mapToList: (
    response: any,
    list: { label: string; thumbnail?: string; context: Context }[]
  ) => { label: string; thumbnail?: string; context: Context }[];
}

export type InferContextSourceContext<T extends ContextSource<any>> = T extends ContextSource<infer Context>
  ? Context
  : never;
