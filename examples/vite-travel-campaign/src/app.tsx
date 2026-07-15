import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlockEditor as PageBlocksEditor } from 'page-blocks/react-client';
import { BlockEditorReact } from 'page-blocks/react-editor';
import {
  COUNTRIES,
  SEASONS,
  createSearchParams,
  getAppContextSummary,
  getCitiesForCountry,
  sanitizeSelection,
  type TravelSelection,
} from './catalog.js';
import { BlockArchive, Slot, SlotContext, directory } from './blocks/directory.js';

const queryClient = new QueryClient();
const PRELOAD_SLOTS = ['hero', 'seasonal_banner', 'content', 'offers'];

function resolvePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
}

function createHref(pathname: string, selection: TravelSelection) {
  const search = createSearchParams(selection);
  return search ? `${pathname}?${search}` : pathname;
}

function useTravelSelection(pathname: string) {
  const [selection, setSelection] = useState<TravelSelection>(() => sanitizeSelection(new URLSearchParams(window.location.search)));

  useEffect(() => {
    const next = sanitizeSelection(new URLSearchParams(window.location.search));
    setSelection(next);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setSelection(sanitizeSelection(new URLSearchParams(window.location.search)));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const nextUrl = createHref(pathname, selection);
    const currentUrl = `${pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [pathname, selection]);

  return [selection, setSelection] as const;
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

function Frame(props: {
  children: ReactNode;
  pathname: string;
  selection: TravelSelection;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="travel-shell">
      <header className="travel-header">
        <div className="travel-header__copy">
          <div className="travel-brand">
            <span className="travel-brand__name">Wayfarer</span>
            <span className="travel-brand__dot" aria-hidden="true" />
          </div>
          <p className="travel-header__eyebrow">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p className="travel-header__description">{props.description}</p>
        </div>

        <nav className="travel-header__nav" aria-label="Travel example routes">
          <a href={createHref('/', props.selection)} aria-current={props.pathname === '/' ? 'page' : undefined}>
            Landing
          </a>
          <a
            href={createHref('/guides', props.selection)}
            aria-current={props.pathname === '/guides' ? 'page' : undefined}
          >
            Guides
          </a>
          <a
            href={createHref('/offers', props.selection)}
            aria-current={props.pathname === '/offers' ? 'page' : undefined}
          >
            Offers
          </a>
          <a href={createHref('/block-archive', props.selection)} aria-current={props.pathname === '/block-archive' ? 'page' : undefined}>
            Block archive
          </a>
        </nav>
      </header>

      {props.children}
    </div>
  );
}

function TravelSelectors(props: {
  pathname: string;
  selection: TravelSelection;
  onChange: (selection: TravelSelection) => void;
}) {
  const cities = getCitiesForCountry(props.selection.country);
  const contextSummary = getAppContextSummary(props.selection);

  return (
    <section className="travel-control-panel">
      <div className="travel-control-panel__header">
        <p className="travel-control-panel__eyebrow">Destination & season</p>
        <h2>Select a destination to see slot overrides in action</h2>
        <p>{contextSummary.body}</p>
      </div>

      <div className="travel-control-grid">
        <label className="travel-control">
          <span>Country</span>
          <select
            value={props.selection.country}
            onChange={(event) => {
              const country = event.target.value as TravelSelection['country'];
              const firstCity = getCitiesForCountry(country)[0].id;
              props.onChange({
                country,
                city: firstCity,
                season: props.selection.season,
              });
            }}
          >
            {COUNTRIES.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <label className="travel-control">
          <span>City</span>
          <select
            value={props.selection.city}
            onChange={(event) => {
              props.onChange({
                ...props.selection,
                city: event.target.value as TravelSelection['city'],
              });
            }}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="travel-control">
          <span>Season</span>
          <select
            value={props.selection.season}
            onChange={(event) => {
              props.onChange({
                ...props.selection,
                season: event.target.value as TravelSelection['season'],
              });
            }}
          >
            <option value="">Any season</option>
            {SEASONS.map((season) => (
              <option key={season.id} value={season.id}>
                {season.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="travel-context-readout">
        <div>
          <dt>Route</dt>
          <dd>{props.pathname}</dd>
        </div>
        <div>
          <dt>Country</dt>
          <dd>{contextSummary.country.name}</dd>
        </div>
        <div>
          <dt>City</dt>
          <dd>{contextSummary.city.name}</dd>
        </div>
        <div>
          <dt>Season</dt>
          <dd>{contextSummary.season?.label || 'Unset'}</dd>
        </div>
      </dl>
    </section>
  );
}

function TravelSlotTree(props: { selection: TravelSelection; children: ReactNode }) {
  return (
    <SlotContext name="country" value={props.selection.country} slots={PRELOAD_SLOTS}>
      <SlotContext name="city" value={props.selection.city} slots={PRELOAD_SLOTS}>
        <SlotContext name="season" value={props.selection.season} slots={PRELOAD_SLOTS}>
          {props.children}
        </SlotContext>
      </SlotContext>
    </SlotContext>
  );
}

function LandingPage(props: { pathname: string; selection: TravelSelection; onChange: (selection: TravelSelection) => void }) {
  return (
    <Frame
      pathname={props.pathname}
      selection={props.selection}
      eyebrow="Wayfarer · page-blocks showcase"
      title="Slow travel, properly done"
      description="Use the destination selectors below to watch slot content adapt in real time — country, city, and season each resolve a more specific JSON file."
    >
      <TravelSlotTree selection={props.selection}>
        <main className="travel-page-grid">
          <TravelSelectors pathname={props.pathname} selection={props.selection} onChange={props.onChange} />
          <Slot name="hero" className="travel-slot travel-slot--hero" />
          <Slot name="seasonal_banner" className="travel-slot travel-slot--banner" />
          <Slot name="content" className="travel-slot travel-slot--content" />
          <Slot name="offers" className="travel-slot travel-slot--offers" />
        </main>
      </TravelSlotTree>
      <DemoEditor />
    </Frame>
  );
}

function GuidesPage(props: { pathname: string; selection: TravelSelection; onChange: (selection: TravelSelection) => void }) {
  return (
    <Frame
      pathname={props.pathname}
      selection={props.selection}
      eyebrow="Destination guides"
      title="How to pace a city"
      description="City-specific guide files override the route-level shelf — select Lisbon or Kyoto to see the content change."
    >
      <TravelSlotTree selection={props.selection}>
        <main className="travel-page-grid">
          <TravelSelectors pathname={props.pathname} selection={props.selection} onChange={props.onChange} />
          <Slot name="hero" className="travel-slot travel-slot--hero" />
          <Slot name="seasonal_banner" className="travel-slot travel-slot--banner" />
          <Slot name="content" className="travel-slot travel-slot--content" />
          <Slot name="offers" className="travel-slot travel-slot--offers" />
        </main>
      </TravelSlotTree>
      <DemoEditor />
    </Frame>
  );
}

function OffersPage(props: { pathname: string; selection: TravelSelection; onChange: (selection: TravelSelection) => void }) {
  return (
    <Frame
      pathname={props.pathname}
      selection={props.selection}
      eyebrow="Curated packages"
      title="Packages that sharpen as you narrow"
      description="Country sets the base offer mix. Adding a city or season resolves a more specific file — try Lisbon in summer or Kyoto in spring."
    >
      <TravelSlotTree selection={props.selection}>
        <main className="travel-page-grid">
          <TravelSelectors pathname={props.pathname} selection={props.selection} onChange={props.onChange} />
          <Slot name="hero" className="travel-slot travel-slot--hero" />
          <Slot name="seasonal_banner" className="travel-slot travel-slot--banner" />
          <Slot name="offers" className="travel-slot travel-slot--offers" />
          <Slot name="content" className="travel-slot travel-slot--content" />
        </main>
      </TravelSlotTree>
      <DemoEditor />
    </Frame>
  );
}

function BlockArchivePage(props: { pathname: string; selection: TravelSelection }) {
  return (
    <Frame
      pathname={props.pathname}
      selection={props.selection}
      eyebrow="Component reference"
      title="Block archive"
      description="Every registered block rendered from its example props — used for screenshots and component reference."
    >
      <main className="travel-page-grid">
        <TravelSlotTree selection={props.selection}>
          <Slot name="hero" className="travel-slot travel-slot--hero" />
        </TravelSlotTree>

        <section className="travel-slot travel-slot--archive">
          <BlockArchive />
        </section>
      </main>
    </Frame>
  );
}

function NotFoundPage(props: { pathname: string; selection: TravelSelection }) {
  return (
    <Frame
      pathname={props.pathname}
      selection={props.selection}
      eyebrow="Example route"
      title="Unknown route"
      description="The travel example exposes landing, guide, offer, and archive pages."
    >
      <main className="travel-page-grid">
        <section className="travel-control-panel">
          <p>Available routes:</p>
          <ul className="travel-route-list">
            <li>
              <a href={createHref('/', props.selection)}>/</a>
            </li>
            <li>
              <a href={createHref('/guides', props.selection)}>/guides</a>
            </li>
            <li>
              <a href={createHref('/offers', props.selection)}>/offers</a>
            </li>
            <li>
              <a href={createHref('/block-archive', props.selection)}>/block-archive</a>
            </li>
          </ul>
        </section>
      </main>
    </Frame>
  );
}

export function App() {
  const pathname = resolvePathname(window.location.pathname);
  const [selection, setSelection] = useTravelSelection(pathname);

  let page = <NotFoundPage pathname={pathname} selection={selection} />;
  if (pathname === '/') {
    page = <LandingPage pathname={pathname} selection={selection} onChange={setSelection} />;
  } else if (pathname === '/guides') {
    page = <GuidesPage pathname={pathname} selection={selection} onChange={setSelection} />;
  } else if (pathname === '/offers') {
    page = <OffersPage pathname={pathname} selection={selection} onChange={setSelection} />;
  } else if (pathname === '/block-archive') {
    page = <BlockArchivePage pathname={pathname} selection={selection} />;
  }

  return <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>;
}
