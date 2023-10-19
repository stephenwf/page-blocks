export interface ContextFlatNode {
  id: string;
  slot: string;
  specificity: number;
  contexts: Array<{
    id: string;
    specificity: number;
    match:
      | {
          type: 'exact';
          value: string;
        }
      | {
          type: 'all';
          excluded?: string[];
        }
      | {
          type: 'none';
        }
      | {
          type: 'filter';
          included: string[];
        };
  }>;
}
