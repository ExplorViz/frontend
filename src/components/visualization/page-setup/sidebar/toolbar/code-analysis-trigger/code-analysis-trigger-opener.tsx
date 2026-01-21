import ComponentOpener from '../../component-opener';
import { ToolbarOpenerProps } from '../../types';

export default function CodeAnalysisTriggerOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Repo Analysis"
      componentId="code-analysis-trigger"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
