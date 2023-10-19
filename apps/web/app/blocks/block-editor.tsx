'use client';

import { useRouter } from 'next/navigation';
import { BlockEditor as CustomBlockEditor } from '@page-blocks/react-client';
import { BlockEditorReact } from '@page-blocks/react-editor';
import { directory } from './directory';

export default function BlockEditor(props: { showToggle?: boolean }) {
  const router = useRouter();
  return (
    <BlockEditorReact>
      <CustomBlockEditor
        options={directory}
        showToggle={props.showToggle}
        onRefresh={() => {
          router.refresh();
        }}
      />
    </BlockEditorReact>
  );
}
