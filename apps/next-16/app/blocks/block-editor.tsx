'use client';

import { useRouter } from 'next/navigation';
import { BlockEditor as CustomBlockEditor } from '@page-blocks/react-client';
import { BlockEditorReact } from '@page-blocks/react-editor';
import { directory } from './directory';
import { useQueryClient } from '@tanstack/react-query';

export default function BlockEditor(props: { showToggle?: boolean; rsc?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  console.log('query client (1)', queryClient);
  return (
    <BlockEditorReact>
      <CustomBlockEditor
        client={queryClient}
        options={directory}
        showToggle={props.showToggle}
        onRefresh={() => {
          if (props.rsc) router.refresh();
        }}
      />
    </BlockEditorReact>
  );
}
