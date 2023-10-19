import { DirectoryOptions } from '@page-blocks/core';
import { BlockArchive } from '@page-blocks/react-client';

export function createBlockArchive(options: DirectoryOptions<any>) {
  return function CustomBlockArchive() {
    return <BlockArchive directory={options} />;
  };
}
