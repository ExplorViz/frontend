import React, { ReactNode } from 'react';

import { XIcon } from '@primer/octicons-react';
import SidebarResizer from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/sidebar-resizer';

interface ToolSelection {
  closeToolSelection: () => void;
  children: ReactNode[];
}

export default function ToolSelection({
  closeToolSelection,
  children,
}: ToolSelection) {
  return (
    <>
      <div className="sidebar-card-container pr-3 pl-3 pb-3">{children}</div>
      <div id="toolsSidebarButtonContainer" className="foreground">
        <button
          type="button"
          className="btn btn-light btn-outline-dark sidebar-button"
          title="Close Sidebar"
          aria-label="Close"
          onClick={closeToolSelection}
        >
          <XIcon size="small" verticalAlign="middle" className="align-middle" />
        </button>
        <SidebarResizer
          buttonName="toolSidebarDragButton"
          containerName="toolsSidebarButtonContainer"
          sidebarName="toolselection"
          expandToRight={true}
        />
      </div>
    </>
  );
}
