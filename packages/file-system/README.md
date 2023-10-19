# Page blocks - filesystem loader
 
Adapter for [Page Blocks](https://github.com/stephenwf/page-blocks) to read and write slots + blocks to the filesystem.

```js
import { createFileSystemLoader } from '@page-blocks/file-system';
import { createRequestHandler } from '@page-blocks/node';

export const fileSystemLoader = createFileSystemLoader({
  path: join(cwd(), 'slots'),
  contexts: [],
});

export const handler = createRequestHandler({
  loader: fileSystemLoader,
  directory,
});
```

## Usage with Next.js (app directory)

```js
// app/api/page-blocks/page.js
import { createFileSystemLoader } from '@page-blocks/file-system';
import { directory } from '../path/to/block/directory';


const fileSystemLoader = createFileSystemLoader({
  path: join(cwd(), 'slots'),
  contexts: [],
});

export const POST = createNextRequestHandler({
  loader: fileSystemLoader,
  directory,
  generateScreenshots,
});
```

With any loader you will get access to the Loader API, which can be used in any Node JS application.

```js
const respose = await fileSystemLoader.query({
  context: { page: 'some/page' },
  slots: ['header', 'footer'],
});
```

There are methods for querying and saving slots and blocks.

```ts

interface SlotQueryRequest {
  slot: string;
  blocks: BlockWithOptionalSlotResponse[];
  options?: any;
}

interface SlotResponse {
  id: string;
  slot: string;
  blocks: BlockWithOptionalSlotResponse[];
  options?: any;
}

interface FullSlotLoader {
  init(force?: boolean): Promise<void>;
  query(
    context: Record<string, string>,
    slotIds: string[]
  ): Promise<{ slots: SlotResponse[]; isEmpty: boolean; slotName: string[]; context: Record<string, string> }>;
  find(slotId: string): Promise<SlotResponse>;
  update(slotId: string, data: SlotResponse | SlotQueryRequest): Promise<void>;
  delete(slotId: string): Promise<void>;
  createSlot(request: CreateSlot): Promise<SlotResponse>;
  createInnerSlot(slotId: string, slot: string, parent: { slotId: string; blockId: string }): Promise<void>;
  deleteInnerSlot(slotId: string, parent: { slotId: string; blockId: string }): Promise<void>;
  updateInnerSlot(
    slotId: string,
    data: SlotQueryRequest | SlotResponse,
    parent: { slotId: string; blockId: string }
  ): Promise<void>;

  createBlock(slotId: string, block: any, parent?: { slotId: string; blockId: string }): Promise<any>;
  deleteBlock(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateBlock(slotId: string, blockId: string, block: any, parent?: { slotId: string; blockId: string }): Promise<void>;
  updateBlockProps(
    slotId: string,
    blockId: string,
    props: any,
    parent?: { slotId: string; blockId: string }
  ): Promise<void>;
  updateSlotOptions(slotId: string, details: any, parent?: { slotId: string; blockId: string }): Promise<void>;
  reorderBlocks(slotId: string, blockIds: string[], parent?: { slotId: string; blockId: string }): Promise<void>;
  moveBlockUp(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
  moveBlockDown(slotId: string, blockId: string, parent?: { slotId: string; blockId: string }): Promise<void>;
}
```
