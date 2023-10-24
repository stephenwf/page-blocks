export interface PropSource<Data = any, Response = any> {
  type: string;
  url: string;
  mapToList: (
    response: Response,
    list: { label: string; thumbnail?: string; props: Data }[]
  ) => { label: string; thumbnail?: string; props: Data }[];
}

export type InferPropSourceData<T extends PropSource<any>> = T extends PropSource<infer Data> ? Data : never;
