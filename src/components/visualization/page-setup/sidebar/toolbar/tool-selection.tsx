import { ReactNode } from 'react';

import { ChevronLeftIcon } from '@primer/octicons-react';
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
          className="sidebar-close-tab"
          title="Close tools sidebar"
          aria-label="Close tools sidebar"
          onClick={closeToolSelection}
        >
          <ChevronLeftIcon size="small" />
        </button>
      </div>
    </>
  );
}
