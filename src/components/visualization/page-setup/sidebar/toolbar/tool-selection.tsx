import { ReactNode } from 'react';

import { XIcon } from '@primer/octicons-react';
import SidebarResizer from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/sidebar-resizer';

interface ToolSelection {
  show: boolean;
  children: ReactNode;
  closeToolSelection: () => void;
}

export default function ToolSelection({
  show,
  children,
  closeToolSelection,
}: ToolSelection) {
  return (
    <div className={show ? 'sidebar left' : 'd-none'} id="toolselection">
      <div className="mt-6 d-flex flex-row w-100" style={{ zIndex: 90 }}>
        <div className="sidebar-card-container pr-3 pl-3 pb-3">{children}</div>
        <div id="toolsSidebarButtonContainer" className="foreground">
          <button
            type="button"
            className="btn btn-light btn-outline-dark sidebar-button"
            title="Close Sidebar"
            aria-label="Close"
            onClick={closeToolSelection}
          >
            <XIcon
              size="small"
              verticalAlign="middle"
              className="align-middle"
            />
          </button>
          <SidebarResizer
            buttonName="toolSidebarDragButton"
            containerName="toolsSidebarButtonContainer"
            sidebarName="toolselection"
            expandToRight={true}
          />
        </div>
      </div>
    </div>
  );
}
