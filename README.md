# Page blocks

Page blocks are an easy way for developers to create customisable and contextual "Slots" and "Blocks" to fill those slots that can be edited in a visual interface.

> [!WARNING]
> Page blocks is experimental and should only be used for static websites edited locally with the file-system provider.

## Getting started

Currently, Page Blocks is only available for React. However, the core concepts and functionality are not React specific and can be ported to other frameworks.

##### Client packages

- `@page-blocks/client`
- `@page-blocks/react`
- `@page-blocks/react-client`
- `@page-blocks/react-editor`

##### Server packages

- `@page-blocks/node`
- `@page-blocks/next`
- `@page-blocks/file-system`
- `@page-blocks/screenshots`

### Creating your blocks

Page blocks works by bundling some of your components that are used to build up pages into a single directory. Not all
components will be blocks. Some will be used to build up the blocks, and will work as normal. This "bundle" of blocks is
called a "block directory". To define props, you need to install `zod`.

First we will create a block.

```js
// blocks/HelloWorld.js
import { block } from '@page-blocks/react';
import { z } from 'zod';

export const HelloWorld = block({
  name: 'Hello world block',
  props: z.object({
    message: z.text()
  }),
}, function HelloWorld(props) {
    return <div>Hello {message}</div>
});
```

This block is a simple component that takes a message prop and displays it. The block function takes two arguments. The
first is a block definition, and the second is the component itself. The block definition is used to describe the block
to the Page Blocks system. The component is the actual component that will be rendered when the block is used.

The return type of the block function is a React component. It can be used like any other React component.

In the root of the blocks/ directory we will create a block directory. This is a file that imports yours blocks and
groups them together.

```js
// blocks/index.js
import { createDirectory } from '@page-blocks/react';
import { HelloWorld } from './HelloWorld';

export const directory = createDirectory({
  resolver: {
    type: 'react-query',
    endpoint: '/api/page-blocks', // defined later
  },
  blocks: {
    HelloWorld
  }
});

export const Slot = directory.Slot;
```

> [!WARNING]
> If you are using Server Components you will need to follow instructions below to create a specific Slot to use. You can instead export `directory.Blocks`

The directory contains some generated and type-safe components and helpers that can be used throughout your project.

At this point we can start using the blocks in our pages.

```js
// pages/example.js
import { Slot } from '../path/to/blocks'; // defined above

export default ExamplePage() {
  return (
    <div>
      <h1>My example page</h1>
      <Slot.HelloWorld message="Hello world" />
    </div>
  );
}
```
We have access to all the blocks we defined in the block directory. We can use them like any other React component. The
props of the block are inferred from the block definition. The props are also type-safe, and you will get completions
for the props, even though we have not written any TypeScript.

We can also create our first Slot. A slot is a list of blocks. Each slot has a name that identifies which area on the
page it is. For example: `header` or `sidebar`. These only need to be unique to the page you are building. You can have
a `header` slot on multiple pages. To define a slot you can use the `Slot` component from the block directory.

```js
// pages/example.js

export default ExamplePage() {
  return (
    <div>
      <h1>My example page</h1>
      <Slot name="header" className="bg-white p-3">
        <Slot.HelloWorld message="Hello world" />
      </Slot>
    </div>
  );
}
```

Slots will be rendered as an HTML element `pb-slot` but you can pass HTML properties to the slot, and they will be
forwarded to the element. This allows you to style the slot using CSS. Additionally, each block will be "wrapped"
in a `pb-block` element. In a production project, these will not have custom elements and will be rendered simply as
if they were `div` elements.

You will need to add the following CSS to your project to ensure they display correctly:
```css
pb-block, pb-slot {
  display: block;
}
```

So far we have created a block directory, and used it to render a block and a slot. However, we have not configured
Page Blocks to customise the blocks using the Page Block Editor.

### Saving and loading blocks

In the example above we configured a "resolver". This is used to load data for the blocks. In this case we are using the
"react-query" resolver, which will make a request to the specified endpoint to load the data. The endpoint is a URL that
will be handled by the Page Blocks server. To configure this endpoint we need to create an API handler.

If you are using Next.js you can use the Next.js integration.

```js
// app/api/page-blocks/route.js
import { createNextRequestHandler } from '@page-blocks/next';
import { createFileSystemLoader } from '@page-blocks/file-system';
import { directory } from '../path/to/blocks'; // defined above

export const loader = createFileSystemLoader({
    path: join(cwd(), 'slots'),
    contexts: ['page'],
});

export const POST = createNextRequestHandler({
  loader: fileSystemLoader,
  directory,
});
```

Or using the `./pages` folder
```js
// pages/api/page-blocks.js
import { createNextRequestHandler } from '@page-blocks/next';
import { createFileSystemLoader } from '@page-blocks/file-system';
import { directory } from '../path/to/blocks'; // defined above

export const loader = createFileSystemLoader({
    path: join(cwd(), 'slots'),
    contexts: ['page'],
});

export default createNextRequestHandler({
  loader: fileSystemLoader,
  directory,
});
```


First we create a loader, this will be used to save and read blocks. At the moment the only loader is the filesystem
loader which will read block data as JSON from a directory structure on the filesystem.

Next we export the API route using the provided helper.

If you are using another Node.js framework you can use the node library directly.

The handler created takes in JSON request and returns a JSON response and can be used with any Node.js framework.
```js
import { createRequestHandler } from '@page-blocks/node';
import { directory } from '../path/to/blocks'; // defined above
import { loader } from '../path/to/loader'; // defined above (filesystem loader)

const handler = createRequestHandler({
  directory,
  canEdit: () => true,
  serverContext: () => ({}),
  loader,
});

// express
app.post('/api/page-blocks', async (req, res) => {
  const response = await handler(req.body);
  res.status(response.status);
  res.json(response.body);
});
```

You can also use the `loader` directly in NodeJS to save and read blocks.

```js
import { loader } from '../path/to/loader';

async function example() {
  const slots = await loader.query({ page: 'example/page' }, ['header', 'footer']);

  // ... do something, grab some blocks.

  // Update a blocks props
  await loader.updateBlockProps('header', block.id, { message: 'Hello world' });
}
```

Finally, to enable editing, we need to add the Page Blocks Editor to our page. This component can be included only in
a local build (hosted servers + authentication coming soon). It will not be included in production builds.

In Next.js you can modify your `_app.js` file to include the editor and a top level React-Query provider.
```js
// pages/_app.js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageBlocksEditor } from '@page-blocks/react-edtior';
import '@page-blocks/react-edtior/dist/index.css'; // import the editor styles

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PageBlocksEditor />
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
```

The editor will be rendered as a floating checkbox in the bottom left corner of the page. Clicking on it will open the
editing interface.

You should now be able to edit the Slot you created on the example page. This will allow you to change the message
prop of the HelloWorld block. When you toggle the "editing mode" the slots and the blocks will be visible. You can
reorder the blocks or edit individual blocks. You need to select "customise" on the slot to switch from the components
defined in code to the customised components.

In order to customise dynamic pages you need to define a "Slot context". This is a wrapper component that will be used
to select the correct slot for the page. If you are using a framework like NextJS you can configure the page to
render the slot configuration on the server.

Below is an example of this all working together.

```js
// pages/pokemon/[pokemon].jsx
export const getServerSideProps = async (context) => {
  return {
     props: {
       slots: await loader.query({ pokemon: context.params?.id as string }, ['pokemon_header', 'pokemon_footer']),
    },
  };
};

export default function PokemonPage({ slots }) {
  const router = useRouter();
  return (
    <SlotContext
      name={'pokemon'} // the name/key of the slot context
      value={router.query.id} // the value of the slot context (e.g. pikachu)
      cache={props.slots} // pass the slots from the server
      slots={['pokemon_header', 'pokemon_footer']} // we list the slots we want to use
    >
      <h1>Pokemon</h1>
      <div>
        <Slot name="pokemon_header">
          <Slot.HelloWorld message="Hello world" />
        </Slot>
      </div>
      <div> ... some other content ... </div>
      <Slot name="pokemon_footer" />
    </SlotContext>
  );
}
```

Now, when you customise a slot, the filesystem loader will create a JSON file for the slot at:
```
slots/@pokemon/pikachu/pokemon_header.json
```

This file will contain the customised blocks. When the page is rendered the blocks will be loaded from the filesystem
and rendered. If there is not a matching override, the defaults will be used.

## Editor

Finally you can import the React editor component to show a UI for toggling "edit" mode on your pages.

```jsx
import { BlockEditor } from '@page-blocks/react-client';
import { BlockEditorReact } from '@page-blocks/react-editor';

export default function MyPage() {
  return (
    <div>
      ... page contents ...
      <BlockEditorReact>
        <BlockEditor />
      </BlockEditorReact>
    </div>
  );
}
```

For production you may want to move this to a component wrapped in `React.lazy()` and only load the editor component during development (or when a user is logged in).

## Server components

NextJS offers React Server Components, and page blocks does work but you can't use the components provided by the `createDirectory()` helper, instead you must create your own `Slot`, `BlockDirectory` and `BlockEditor`

For server components, its best to have a directory to keep all of your block related code. For this example, we will create a `./blocks` directory to hold everything.

First we will create our directory. This is available both on the server and on the client. Because you are limited with server components, you have to define this on its own.

Like before, this will act like a "bundle" for your components, so include each here.

```js
// blocks/directory.js
import { createDirectory } from '@page-blocks/react';
import { Card } from '../components/Card';

export const directory = createDirectory({
  context: {},
  resolver: {
    type: 'tanstack-query',
    endpoint: '/api/page-blocks',
    screenshots: '/blocks',
  },
  blocks: {
    Card,
  },
});

// An alternative to `directory.Slot` that just has the blocks
export const Blocks = directory.Blocks;

```


Then we will create a `server.js` file. This will contain all the configuration for our server code.
```jsx
// blocks/server.js
import { join } from 'node:path';
import { cwd } from 'node:process';
import { createFileSystemLoader } from '@page-blocks/file-system';
import { createRequestHandler } from '@page-blocks/node';
import { directory } from './directory';


export const fileSystemLoader = createFileSystemLoader({
  path: join(cwd(), 'slots'),
  contexts: [],
});

// Note: You could also create your next request handler here.
export const handler = createRequestHandler({
  loader: fileSystemLoader,
  directory,
});

```

Now we need to create custom server + client components.

Firs the Slot. This is a "Server component", so it needs to follow the rules on what it can import.
```js
// blocks/slot.js
import { CustomSlot } from '@page-blocks/react';
import { fileSystemLoader } from './server.js';
import { directory } from './directory';

export async function Slot() {
  // Use the filesystem loader from our `server.js` to load the slot.
  const slotResponse = await fileSystemLoader.query(
	props.context,
	[props.name]
  );

  const options = {
    resolver: directory.resolver,
    blocks: directory.blocks
  };

  // Pass the <CustomSlot /> a name, data, context + directory
  return (
    <CustomSlot
      name={props.name}
      slot={slotResponse.slots[props.name]}
      context={props.context}
      options={options}
    >
      {props.children}
    </CustomSlot>
  );
}
```

Next is the Block editor.  This is a "Client component" and must have the `'use client';` on the first line. In this component we must also tell the component how to refresh the data once a change has been made. In this example we are using the next/navigation package and hook.

```jsx
// blocks/block-editor.js
'use client';

import { CustomBlockEditor } from '@page-blocks/react';
import { BlockEditorReact } from '@page-blocks/react-editor';
import { useRouter } from 'next/navigation';
import { directory } from './directory';

export function BlockEditor(props) {
  const router = useRouter();
  return (
    <BlockEditorReact>
      <CustomBlockEditor
        options={directory}
        onRefresh={() => router.refresh()}
        {...props}
      />
    </BlockEditorReact>
  );
}
```


### Web Components

There are 4 custom elements defined. By default they do not have any implementation, which is a key extension point for different frameworks. The production and framework-specific rendering queries for the correct slot on a page, and renders the web components wrapping each block in the slot.
```html
<pb-slot slot-name="footer" slot-id="Zm9vdGVyLmpzb24=" slot-size="3">

  <pb-block block-type="Card" block-id="4kc727" id="pb-4kc727">
     ... block code ...
  </pb-block>

  <pb-block block-type="Card" block-id="chu0x" id="pb-chu0x">
     ... block code ...
  </pb-block>

  <pb-block block-type="Card" block-id="5mcvw8" id="pb-5mcvw8">
     ... block code ...
  </pb-block>
</pb-slot>
```

These elements will be in the shipped production code, so in theory you could use them for styling using the attribute selector - however you can also pass `className` and `blockClassName` to the `<Slot />` rendering. They should be used for layouts, to keep them separated from your blocks.

When an editing interface is loaded, like the provided React editor, they will define web components for `pb-slot` and `pb-block`. There is also a framework-less implementation that uses CSS + Vanilla javascript to provide an editing UI. These components dispatch events to between each other to grab contextual information about where the blocks and slots are (slotId, parent slots, context etc.). They then query the page to find a `pb-editor` web component and calls an API it provides. Note: an alternative implementation could use different logic.

The `pb-editor` element acts as an interface to all the editing operations that can be performed. This keeps the integration in one place. You pass it down references to the directory (e.g. available blocks) and from that it will create a "slot editing client" that can be used to make requests for editing slots/blocks. It will then either wait for events on the page to trigger or provide an API for other web components or code to call.

For example, when it detects an "add block to slot" event, it will append itself with a `<div />` (not Shadow DOM) and render the React component for adding a slot. It will pass the component the slot editing client and the slotId from the event. This is then styled on shown on the page.

If your configured route has authentication, such as a cookie, you can conditionally load the whole editing interface script tag - and none of the web components will be registered.

But **why web components**? As frameworks like HTMX has shown, HTML is a powerful and descriptive declarative format that can be output by almost every programming language in some way.  Describing the slots and blocks using declarative web components opens up the pattern to many languages and frameworks - swapping out the slot rendering and editor implementations.

It also allow the slot and block formats to become stable quickly, as it's a simple format to output.


## Roadmap

Planned packages:
- `@page-blocks/postgres` - postgres storage adapter
- `@page-blocks/sqlite` - sqlite storage adapter
- `@page-blocks/vue` - vue block directory support
- `@page-blocks/astro` - astro block directory support
- `@page-blocks/solid` - solid block directory support
- `@page-blocks/default-editor` - preact + bundled editor (no react dependency)
- `@page-blocks/draftjs` - draftjs prop plugin
- `@page-blocks/tinymce` - tinymce prop plugin
- `@page-blocks/attachments` - ability to reference on disk files in blocks  (e.g. markdown / html)
- `@page-blocks/testing-framework`  - inline block testing
- `@page-blocks/vite-plugin` - Compiler for removing block data in production
- `@page-blocks/migrations` - component migration support
