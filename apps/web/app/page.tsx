import { BlockEditor } from './blocks/block-editor.lazy';
import { Slot } from './blocks/slot';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="max-w-[800px] w-full bg-white p-4 rounded">
        <h1>Hello world</h1>
        <Slot name="header" context={{}} />

        {process.env.NODE_ENV !== 'production' ? <BlockEditor showToggle rsc /> : null}

        <div className="py-4">
          <a className="text-blue-500 hover:underline" href="/client">
            Client component version
          </a>
        </div>
      </div>
    </main>
  );
}
