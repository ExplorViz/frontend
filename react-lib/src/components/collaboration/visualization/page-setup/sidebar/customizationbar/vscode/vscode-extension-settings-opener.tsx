import React from 'react';
import ComponentOpener from 'react-lib/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { SidebarOpenerProps } from 'react-lib/src/components/visualization/page-setup/sidebar/types';

export default function VscodeExtensionOpener({
  openedComponent,
  toggleSettingsSidebarComponent,
}: SidebarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Extension"
      componentId="VSCode-Extension-Settings"
      toggleComponent={toggleSettingsSidebarComponent}
    />
  );
}
