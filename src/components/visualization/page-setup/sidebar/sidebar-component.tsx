import React, { useCallback } from 'react';

// TODO: How to get child components in here via helper?
export default function SidebarComponent({ componentId, children }) {
  const onWheel: React.WheelEventHandler = (event) => {
    document
      .querySelector('.tse-scroll-content')
      ?.dispatchEvent(event.nativeEvent);
  };

  const replaceDashesWithSpaces = (name: string) => {
    return name.replace(/-/g, ' ');
  };

  return (
    <div className="card sidebar-card mt-3" onWheel={onWheel}>
      <div className="card-body d-flex flex-column">
        <h5 className="text-center">{replaceDashesWithSpaces(componentId)}</h5>
        {children}
      </div>
    </div>
  );
}
