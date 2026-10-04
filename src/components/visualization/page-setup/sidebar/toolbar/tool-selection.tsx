import { ReactNode } from 'react';

import { XIcon } from '@primer/octicons-react';
import SidebarResizeHandle from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/sidebar-resize-handle';

interface ToolSelection {
  closeToolSelection: () => void;
  children: ReactNode;
}

export default function ToolSelection({
  closeToolSelection,
  children,
}: ToolSelection) {
  return (
    <>
      <div className="sidebar-card-container">
        <div className="sidebar-content">
          {children}
          <SidebarResizeHandle
            sidebarId="toolselection"
            side="left"
            ariaLabel="Resize tools sidebar"
          />
        </div>
      </div>
      <div id="toolsSidebarButtonContainer" className="foreground">
        <button
          type="button"
          className="btn btn-outline-secondary sidebar-button"
          title="Close Sidebar"
          aria-label="Close"
          onClick={closeToolSelection}
        >
          <XIcon size="small" verticalAlign="middle" className="align-middle" />
        </button>
      </div>
    </>
  );
}
