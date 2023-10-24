'use client';

import { Slot } from '../blocks/directory';
import BlockEditor from '../blocks/block-editor';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="max-w-[800px] w-full bg-white p-4 rounded">
        <h1>Hello world</h1>

        <Slot name="header" />

        <BlockEditor showToggle />

        <div className="py-4">
          <a className="text-blue-500 hover:underline" href="/">
            Server component version
          </a>
        </div>
      </div>
    </main>
  );
}
