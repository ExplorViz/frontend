import { ChevronRightIcon } from '@primer/octicons-react';
import UndoRestructure from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/restructure/undo-restructure';
import { ReactNode } from 'react';
import SidebarResizeHandle from '../sidebar-resize-handle';

interface SettingsSidebarProps {
  closeSettingsSidebar: () => void;
  children: ReactNode;
}

export default function SettingsSidebar({ closeSettingsSidebar, children }: SettingsSidebarProps) {
  return (
    <>
      <div id="sidebarButtonContainer">
        <button
          type="button"
          className="sidebar-close-tab"
          title="Close settings sidebar"
          aria-label="Close settings sidebar"
          onClick={closeSettingsSidebar}
        >
          <ChevronRightIcon size="small" />
        </button>
        <UndoRestructure />
      </div>
      <div className="sidebar-card-container">
        <div className="sidebar-content">
          {children}
          <SidebarResizeHandle sidebarId="settingsSidebar" side="right" ariaLabel="Resize settings sidebar" />
        </div>
      </div>
    </>
  );
}
