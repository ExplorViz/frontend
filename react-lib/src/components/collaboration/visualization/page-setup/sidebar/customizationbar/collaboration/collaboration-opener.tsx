import React from 'react';
import ComponentOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { SidebarOpenerProps } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/types';

export default function CollaborationOpener({
  openedComponent,
  toggleSettingsSidebarComponent,
}: SidebarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Collaboration"
      componentId="Collaboration"
      toggleComponent={toggleSettingsSidebarComponent}
    />
  );
}
