import { BlockConfig, PropSource } from '@page-blocks/core';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function SourceSearch(props: { source: PropSource; config: BlockConfig; onAdd: (props: any) => void }) {
  if (props.source.type !== 'search') {
    return <div>Unsupported source type (type=search only supported)</div>;
  }

  const [q, setQuery] = useState('');

  const { data } = useQuery<
    Array<{
      label: string;
      thumbnail: string;
      props: any;
    }>
  >({
    queryKey: ['search', { q }],
    queryFn: async (vars) => {
      if (!q) {
        // return [];
      }
      const response = fetch(props.source.url.replace('{query}', q), { signal: vars.signal }).then((res) => res.json());
      if (props.source.mapToList) {
        const list: any[] = [];
        return props.source.mapToList(await response, list) || list;
      }
      return response;
    },
    keepPreviousData: true,
  });

  return (
    <div style={{ maxWidth: '100%', width: 1200 }}>
      <label className="block-add__label" htmlFor="block-search">
        {props.source.type}
      </label>
      <input
        id="block-search"
        className="block-add__search"
        placeholder="search"
        type="text"
        value={q}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="block-add__grid">
        {data?.map((item, k) => {
          return (
            <div onClick={() => props.onAdd(item.props)} className="block-add__block" key={k}>
              {item.thumbnail ? (
                <div className="block-add__thumbnail-container">
                  <img src={item.thumbnail} className="block-add__thumbnail" alt="" />
                </div>
              ) : null}
              <div className="block-add__block-label">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
