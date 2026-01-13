'use client';

import { useStore } from '@nanostores/react';
import { editingMode } from '@page-blocks/client';
import { useEffect } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { DirectoryOptions } from '@page-blocks/core';
import '@page-blocks/client';

export function BlockEditor({
  client,
  options,
  showToggle,
  onRefresh,
}: {
  client: QueryClient;
  options: Omit<DirectoryOptions<any>, 'blocks'>;
  showToggle?: boolean;
  onRefresh?: () => void;
}) {
  const $editMode = useStore(editingMode);

  useEffect(() => {
    if ($editMode) {
      document.body.classList.add('edit-mode');
    } else {
      document.body.classList.remove('edit-mode');
    }
  }, [$editMode]);

  return (
    <>
      <pb-editor
        ref={(ref: any) => {
          if (!ref) return;
          ref.queryClient = client;
          ref.options = options;
          ref.onRefresh = onRefresh;
        }}
      />

      {showToggle ? (
        <div className="block-editor-toggle">
          <label className="block-editor-toggle__label">
            <input type="checkbox" checked={$editMode} onChange={() => editingMode.set(!$editMode)} />
            <span>Edit Mode</span>
          </label>
        </div>
      ) : null}
    </>
  );
}
