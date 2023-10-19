'use client';

import { useStore } from '@nanostores/react';
import { previewBlockProps } from '@page-blocks/client';
import { RenderBlock, RenderBlockProps } from '../../react/src/components/render-block';

export function RenderPreviewBlock(props: RenderBlockProps) {
  const previewProps = useStore(previewBlockProps);
  return <RenderBlock editing={true} {...props} componentProps={previewProps} />;
}
