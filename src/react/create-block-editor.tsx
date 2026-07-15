import { DirectoryOptions } from '../core';
import { BlockEditor } from '../react-client';

export function createBlockEditor(options: DirectoryOptions<any>) {
  return function CustomBlockEditor(props: { showToggle?: boolean }) {
    return <BlockEditor options={options} showToggle={props.showToggle} />;
  };
}
