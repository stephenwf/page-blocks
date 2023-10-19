import { DirectoryOptions } from '@page-blocks/core';
import { BlockEditor } from '@page-blocks/react-client';

export function createBlockEditor(options: DirectoryOptions<any>) {
  return function CustomBlockEditor(props: { showToggle?: boolean }) {
    return <BlockEditor options={options} showToggle={props.showToggle} />;
  };
}
