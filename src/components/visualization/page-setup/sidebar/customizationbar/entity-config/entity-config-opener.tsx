import ComponentOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { SidebarOpenerProps } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/types';

export default function EntityConfigOpener({
  openedComponent,
  toggleSettingsSidebarComponent,
}: SidebarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Entity Config"
      componentId="Entity-Config"
      toggleComponent={toggleSettingsSidebarComponent}
    />
  );
}
