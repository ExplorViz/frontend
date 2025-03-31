import React from 'react';
import ComponentOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { ToolbarOpenerProps } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/types';

export default function EntityFilteringOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Entity Filtering"
      componentId="entity-filtering"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
