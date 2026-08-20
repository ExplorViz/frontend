import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import Button from 'react-bootstrap/Button';

export default function MetricShortcuts() {
  const updateSetting = useUserSettingsStore((s) => s.updateSetting);
  const heatmapEnabled = useUserSettingsStore((s) => s.visualizationSettings.heatmapEnabled.value);

  const handleHeatmapClick = () => {
    const newState = !heatmapEnabled;
    updateSetting('heatmapEnabled', newState);
  };

  const openBuildingConfig = () => {
    eventEmitter.emit('openSettingsSidebar')
    eventEmitter.emit('restructureComponent', "Building-Config")
  }

  return (
    <div className="social-metrics-control-block">
      <span className="social-metrics-control-label">Shortcuts
        <HelpTooltip title="Toggle the Heatmap and Building Config panels to select and display the social metrics." placement="top" />
      </span>
      <div className="social-metrics-preset-group social-metrics-shortcut-buttons">
        <Button size="sm" variant='outline-secondary'
        onClick={handleHeatmapClick}>
          Show Heatmap
        </Button>
        <Button size="sm" variant='outline-secondary'
        onClick={openBuildingConfig}>
          Building Config
        </Button>
      </div>
    </div>
  );
}
