import React from 'react';

import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

interface TraceOverviewProps {
  readonly dynamicData: DynamicLandscapeData;
  readonly visualizationPaused: boolean;
  toggleSettingsSidebarComponent(componentPath: string): void;
  toggleVisualizationUpdating(): void;
}

export default function TraceOverview({
  dynamicData,
  visualizationPaused,
  toggleSettingsSidebarComponent,
  toggleVisualizationUpdating,
}: TraceOverviewProps) {
  const showInfoToastMessage = useToastHandlerStore(
    (state) => state.showInfoToastMessage
  );

  const showTraces = () => {
    if (dynamicData.length === 0) {
      showInfoToastMessage('No Traces found!');
      return;
    }
    if (!visualizationPaused) {
      toggleVisualizationUpdating();
    }
    showInfoToastMessage('Visualization paused!');
    toggleSettingsSidebarComponent('trace-selection');
  };

  return (
    <li className="nav-item">
      <div
        className="nav-link-with-cursor"
        title="Show Traces"
        onClick={showTraces}
      >
        Trace Overview
      </div>
    </li>
  );
}
