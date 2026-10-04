import { XIcon } from '@primer/octicons-react';
import UndoRestructure from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/restructure/undo-restructure';
import { ReactNode } from 'react';
import SidebarResizeHandle from '../sidebar-resize-handle';

interface SettingsSidebarProps {
  closeSettingsSidebar: () => void;
  children: ReactNode;
}

export default function SettingsSidebar({
  closeSettingsSidebar,
  children,
}: SettingsSidebarProps) {
  return (
    <>
      <div id="sidebarButtonContainer">
        <button
          type="button"
          className="btn btn-outline-secondary sidebar-button"
          title="Close Sidebar"
          aria-label="Close"
          onClick={closeSettingsSidebar}
        >
          <XIcon size="small" className="align-middle" />
        </button>
        <UndoRestructure />
      </div>
      <div className="sidebar-card-container">
        <div className="sidebar-content">
          {children}
          <SidebarResizeHandle
            sidebarId="settingsSidebar"
            side="right"
            ariaLabel="Resize settings sidebar"
          />
        </div>
      </div>
    </>
  );
}
