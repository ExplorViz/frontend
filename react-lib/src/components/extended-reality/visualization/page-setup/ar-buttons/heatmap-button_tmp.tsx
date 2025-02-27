import React from 'react';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import Button from 'react-bootstrap/Button';
import { FlameIcon } from '@primer/octicons-react';

interface HeatmapButtonProps {
  toggleHeatmap: () => void;
}

export default function HeatmapButton({ toggleHeatmap }: HeatmapButtonProps) {
  const isHeatmapActive = useHeatmapConfigurationStore(
    (state) => state.heatmapActive
  );

  return (
    <div id="ar-heatmap-interaction-container">
      <Button
        variant={isHeatmapActive ? 'success' : 'primary'}
        className="half-transparent"
        onClick={toggleHeatmap}
      >
        <FlameIcon size="small" className="align-middle ar-button-svg" />
      </Button>
    </div>
  );
}
