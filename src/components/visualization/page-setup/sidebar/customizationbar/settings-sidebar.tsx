import { XIcon } from '@primer/octicons-react';
import React, { ReactNode } from 'react';
import SidebarResizer from '../sidebar-resizer';
import UndoRestructure from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/restructure/undo-restructure';

interface SettingsSidebarProps {
  closeSettingsSidebar: () => void;
  children: ReactNode[];
}

export default function SettingsSidebar({
  closeSettingsSidebar,
  children,
}: SettingsSidebarProps) {
  return (
    <>
      <div id="sidebarButtonContainer" className="foreground">
        <button
          type="button"
          className="btn btn-light btn-outline-dark sidebar-button"
          title="Close Sidebar"
          aria-label="Close"
          onClick={closeSettingsSidebar}
        >
          <XIcon size="small" className="align-middle" />
        </button>
        <SidebarResizer
          buttonName="sidebarDragButton"
          containerName="sidebarButtonContainer"
          sidebarName="settingsSidebar"
        />
        <UndoRestructure />
      </div>
      <div className="sidebar-card-container pr-3 pl-3 pb-3">{children}</div>
    </>
  );
}
