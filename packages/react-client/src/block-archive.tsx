'use client';

import { Suspense, useEffect, useState } from 'react';
import { BlockConfig, blockSymbol, DirectoryOptions } from '@page-blocks/core';

export function BlockArchive(props: { directory: DirectoryOptions<any> }) {
  const keys = Object.keys(props.directory.blocks || {});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      {isLoaded ? (
        <script id="block-archive" type="application/json">
          {JSON.stringify({
            blocks: keys.map((key) => {
              const Block = props.directory.blocks[key] as any;
              return { type: key, ...(Block[blockSymbol] as BlockConfig<any, any>) };
            }),
          })}
        </script>
      ) : null}
      {keys.map((key) => {
        const Block = props.directory.blocks[key] as any;

        const blockData = Block[blockSymbol] as BlockConfig<any, any>;
        const data = Block[blockSymbol];
        const type = key;
        const label = data.label;
        const examples = blockData.examples || [];

        return (
          <div className="block-archive" key={key}>
            <h2 className="block-archive__label">{label || type}</h2>
            {data.description ? <p className="block-archive__description">{data.description}</p> : null}
            {examples.length ? <h3 className="block-archive__examples">Examples</h3> : null}
            {examples.map((example, idx) => (
              <section className="block-archive__block" key={idx}>
                <h4 className="block-archive__block-label">{example.label}</h4>
                <div className="block-archive__block-container" id={`example_${type}__${idx}`}>
                  <Suspense fallback={null}>
                    <Block {...(example.props || {})} context={example.context || {}} />
                  </Suspense>
                </div>
              </section>
            ))}
          </div>
        );
      })}
    </>
  );
}
