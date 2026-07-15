import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlockEditor as PageBlocksEditor } from 'page-blocks/react-client';
import { BlockEditorReact } from 'page-blocks/react-editor';
import { BlockArchive, Slot, directory } from './blocks/directory.js';

const queryClient = new QueryClient();

function resolvePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
}

function DemoEditor() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <BlockEditorReact>
      <PageBlocksEditor options={directory} showToggle />
    </BlockEditorReact>
  );
}

function Frame(props: { children: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p className="app-description">{props.description}</p>
        </div>

        <nav className="app-nav" aria-label="Example pages">
          <a href="/">Editable demo</a>
          <a href="/block-archive">Block archive</a>
        </nav>
      </header>

      {props.children}
    </div>
  );
}

function HomePage() {
  return (
    <Frame
      eyebrow="Primary example"
      title="Vite + page-blocks"
      description="This client-rendered example uses the native page-blocks Vite plugin and filesystem-backed slots."
    >
      <main className="page-grid">
        <section className="page-panel">
          <h2>Why this example exists</h2>
          <p>
            The demo keeps the integration surface small: Vite for the app, the native <code>page-blocks/vite</code>{' '}
            plugin for slot requests, and local JSON files for persistence.
          </p>
          <p>
            Use the editor toggle in development to customise the slots below. Changes are written back to
            <code> examples/vite/slots</code>.
          </p>
        </section>

        <Slot name="hero" className="demo-slot demo-slot--hero" />
        <Slot name="content" className="demo-slot demo-slot--content" />
      </main>

      <DemoEditor />
    </Frame>
  );
}

function BlockArchivePage() {
  return (
    <Frame
      eyebrow="Screenshots"
      title="Block archive"
      description="This route renders example states for each block so the screenshot generator can capture them, and uses path-based slot resolution."
    >
      <main className="archive-page">
        <Slot name="hero" className="demo-slot demo-slot--hero" />
        <BlockArchive />
      </main>
    </Frame>
  );
}

function NotFoundPage() {
  return (
    <Frame
      eyebrow="Example route"
      title="Unknown route"
      description="This Vite example only exposes the editable demo and the screenshot archive."
    >
      <main className="page-panel">
        <p>Available routes:</p>
        <ul className="route-list">
          <li>
            <a href="/">/</a>
          </li>
          <li>
            <a href="/block-archive">/block-archive</a>
          </li>
        </ul>
      </main>
    </Frame>
  );
}

export function App() {
  const pathname = resolvePathname(window.location.pathname);

  let page = <NotFoundPage />;
  if (pathname === '/') {
    page = <HomePage />;
  } else if (pathname === '/block-archive') {
    page = <BlockArchivePage />;
  }

  return <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>;
}
