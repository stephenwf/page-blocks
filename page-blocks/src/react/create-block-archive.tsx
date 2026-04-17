import { DirectoryOptions } from '../core';
import { BlockArchive } from '../react-client';

export function createBlockArchive(options: DirectoryOptions<any>) {
  return function CustomBlockArchive() {
    return <BlockArchive directory={options} />;
  };
}
