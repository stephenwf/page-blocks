'use client';

import { useStore } from '@nanostores/react';
import { editingMode } from '@page-blocks/client';
import { useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';
import { DirectoryOptions } from '@page-blocks/core';
import '@page-blocks/client';

export function BlockEditor({
  options,
  showToggle,
  onRefresh,
}: {
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
  const ref = useRef<any>(null);
  const client = useQueryClient();

  useEffect(() => {
    if (ref.current) {
      ref.current.queryClient = client;
      ref.current.options = options;
      ref.current.onRefresh = onRefresh;
    }
  }, [client]);

  return (
    <>
      <pb-editor ref={ref} />

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
