import { BlockEditor } from './blocks/block-editor.lazy';
import { Slot } from './blocks/slot';
import { FourGrid } from './components/four-grid';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-red-400">
      <div className="max-w-[1000px] w-full bg-white p-4 rounded">
        <h1>Hello world</h1>
        <Slot name="header" context={{}} class="grid grid-cols-3" />

        <Slot name="footer" context={{}} />

        {process.env.NODE_ENV !== 'production' ? <BlockEditor showToggle rsc /> : null}

        <FourGrid>
          <div>A</div>
          <div>B</div>
          <div>C</div>
          <div>D</div>
        </FourGrid>

        <div className="py-4">
          <a className="text-blue-500 hover:underline" href="/client">
            Client component version
          </a>
        </div>
      </div>
    </main>
  );
}
