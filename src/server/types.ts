import { CreateSlot, SlotDocument } from '../core';

export interface StoredPageBlocksDocument {
  id: string;
  scope: string;
  locator: CreateSlot;
  version: number;
  document: SlotDocument;
}

export interface PageBlocksStore {
  query(scope: string, context: Record<string, string>, slots?: string[]): Promise<StoredPageBlocksDocument[]>;
  list(scope: string): Promise<StoredPageBlocksDocument[]>;
  get(scope: string, documentId: string): Promise<StoredPageBlocksDocument | null>;
  create(scope: string, locator: CreateSlot, document: SlotDocument): Promise<StoredPageBlocksDocument>;
  save(
    scope: string,
    documentId: string,
    expectedVersion: number,
    document: SlotDocument
  ): Promise<StoredPageBlocksDocument>;
  delete(scope: string, documentId: string, expectedVersion: number): Promise<void>;
  transaction?<Result>(run: (store: PageBlocksStore) => Promise<Result>): Promise<Result>;
}
