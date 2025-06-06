import React from 'react';
import ComponentOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { ToolbarOpenerProps } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/types';

export default function TraceReplayerOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Trace Player"
      componentId="Trace-Replayer"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
