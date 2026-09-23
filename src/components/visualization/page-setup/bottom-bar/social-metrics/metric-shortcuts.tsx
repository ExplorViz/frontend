import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { use } from 'react';
import Button from 'react-bootstrap/Button';
import {
  SettingsSidebarContext,
  SettingsSidebarTab,
} from '../../sidebar/customizationbar/settings-sidebar-context';

export default function MetricShortcuts() {
  const updateSetting = useUserSettingsStore((s) => s.updateSetting);
  const heatmapEnabled = useUserSettingsStore(
    (s) => s.visualizationSettings.heatmapEnabled.value
  );

  const settingsSidebarContext = use(SettingsSidebarContext);

  const handleHeatmapClick = () => {
    const newState = !heatmapEnabled;
    updateSetting('heatmapEnabled', newState);
  };

  const openEntityConfig = () => {
    settingsSidebarContext.openSettingsSidebarTab(
      SettingsSidebarTab.EntityConfig
    );
  };

  return (
    <div className="social-metrics-control-block">
      <span className="social-metrics-control-label">
        Shortcuts
        <HelpTooltip
          title="Toggle the Heatmap and Entity Config panels to select and display the social metrics."
          placement="top"
        />
      </span>
      <div className="social-metrics-preset-group social-metrics-shortcut-buttons">
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={handleHeatmapClick}
        >
          Show Heatmap
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={openEntityConfig}
        >
          Building Config
        </Button>
      </div>
    </div>
  );
}
