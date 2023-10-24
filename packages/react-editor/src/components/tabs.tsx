import { useState } from 'react';

interface TabProps {
  items: Array<{
    label: string;
    render: () => any;
  }>;
  initialTab?: number;
}

export function Tabs({ items, initialTab = 0 }: TabProps) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="block-add-tabs">
      <div className="block-add-tabs__row">
        {items.map((item, i) => (
          <button
            key={i}
            className={`block-add-tabs__tab ${tab === i ? 'block-add-tabs__tab--active' : ''}`}
            onClick={() => setTab(i)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="block-add-tabs__content">{items[tab].render()}</div>
    </div>
  );
}
