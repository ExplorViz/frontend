import ComponentOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import { ToolbarOpenerProps } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/types';

export default function EntitySearchOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Entity Search"
      componentId="entity-search"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
