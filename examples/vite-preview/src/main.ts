import { createRemoteLoader, getPageBlocksRuntime } from 'page-blocks/client';

const runtime = getPageBlocksRuntime();
const source = document.querySelector<HTMLElement>('#source')!;
const headline = document.querySelector<HTMLElement>('#headline')!;

async function render() {
  const response = await createRemoteLoader({ blocks: {} })({ path: '/' }, ['hero'])[1]();
  const block = response.slots.hero?.blocks[0];
  source.textContent = `Content source: ${runtime.getSnapshot().source}`;
  headline.textContent = String((block?.data as { title?: string } | undefined)?.title || 'No hero matched');
}

runtime.subscribe(() => void render());
void render();
