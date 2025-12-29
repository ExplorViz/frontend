import ComponentOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { ToolbarOpenerProps } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/types';

export default function ApplicationSearchOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Application Search"
      componentId="application-search"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
