import {
  createPageBlocksRemoteClient,
  type PageBlocksPreviewBootstrap,
} from 'page-blocks/client';

const bootstrap: PageBlocksPreviewBootstrap = async ({ runtime, loadEditor }) => {
  const token = new URL(location.href).searchParams.get('edit');
  if (!token) return;

  runtime.useRemote({
    client: createPageBlocksRemoteClient({
      endpoint: '/api/page-blocks',
      headers: { authorization: `Bearer ${token}` },
    }),
    capabilities: { read: true, edit: true },
  });

  const editor = await loadEditor();
  document.dispatchEvent(new CustomEvent('page-blocks:editor-ready', { detail: editor }));
  return () => runtime.useStatic();
};

export default bootstrap;
