import { useState } from 'react';

interface ComponentTabsProps<T> {
  tabs: { value: T; content: React.ReactNode }[];
  activeTab?: T | null;
  onChange?(newActiveTab: T | null): void;
}

export default function ComponentTabs<T>({ tabs, activeTab, onChange }: ComponentTabsProps<T>) {
  const [selectedTabId, setSelectedTabId] = useState<T | null>(null);

  const selectedTab =
    activeTab !== undefined ? tabs.find((t) => t.value === activeTab) : tabs.find((t) => t.value === selectedTabId);

  const onTabClick = (clickedTab: T) => {
    setSelectedTabId(clickedTab);
    onChange?.(clickedTab);
  };

  return (
    <div className="card sidebar-card">
      <div className="explorviz-visualization-navbar">
        <ul className="nav justify-content-center">
          {tabs.map((tab) => (
            <ComponentTab
              key={String(tab.value)}
              value={tab.value}
              selected={selectedTab?.value === tab.value}
              onClick={onTabClick}
            />
          ))}
        </ul>
      </div>
      {selectedTab && <div className="card-body d-flex flex-column">{selectedTab.content}</div>}
    </div>
  );
}

interface ComponentTabProps<T> {
  value: T;
  selected: boolean;
  onClick(value: T): void;
}

export function ComponentTab<T>({ value, selected, onClick }: ComponentTabProps<T>) {
  return (
    <li className="nav-item">
      <div className="nav-link-with-cursor" title={'Show/Hide ' + String(value)} onClick={() => onClick(value)}>
        <div className={selected ? 'fw-bold' : 'fw-normal'} data-label={String(value)}>
          {String(value)}
        </div>
      </div>
    </li>
  );
}
