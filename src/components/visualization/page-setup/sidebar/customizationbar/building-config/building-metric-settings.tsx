import RangeSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/range-setting';
import SelectSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/select-setting';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  BUILDING_DIMENSION_ORDER,
  BUILDING_DIMENSION_SETTINGS,
  BUILDING_FOOTPRINT_SETTING_ID,
  BUILDING_METRIC_MAPPING_SETTING_ID,
} from 'explorviz-frontend/src/utils/settings/building-config-settings';
import {
  SelectedBuildingMetric,
  SettingDependency,
  VisualizationSettingId,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

function isDependencyMet(
  dependsOn: SettingDependency | undefined,
  allSettings: VisualizationSettings
): boolean {
  if (dependsOn === undefined) {
    return true;
  }

  const dependentSetting = allSettings[dependsOn.settingId];
  const dependentValue = dependentSetting.value;

  if ('value' in dependsOn) {
    return dependentValue === dependsOn.value;
  }

  if ('values' in dependsOn) {
    return dependsOn.values.includes(dependentValue);
  }

  if ('notEqual' in dependsOn) {
    return dependentValue !== dependsOn.notEqual;
  }

  if ('notValues' in dependsOn) {
    return !dependsOn.notValues.includes(dependentValue);
  }

  return false;
}

export default function BuildingMetricSettings() {
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const updateUserSetting = useUserSettingsStore(
    (state) => state.updateSetting
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const updateRangeSetting = (name: VisualizationSettingId, value: number) => {
    try {
      updateUserSetting(name, value);
    } catch (error: unknown) {
      showErrorToastMessage(
        error instanceof Error ? error.message : 'Failed to update setting.'
      );
    }
  };

  const updateSelectSetting = (
    name: VisualizationSettingId,
    value: unknown
  ) => {
    updateUserSetting(name, value);
  };

  return (
    <div className="building-config-metrics">
      <p className="building-config-section-description">
        Choose which code metrics control building size. Use multipliers to fine
        tune the visual scale.
      </p>

      <div className="building-config-metric-card">
        <SelectSetting
          settingId={BUILDING_METRIC_MAPPING_SETTING_ID}
          onChange={updateSelectSetting}
        />
      </div>

      {BUILDING_DIMENSION_ORDER.map((dimension) => {
        const { label, metricSettingId, multiplierSettingId } =
          BUILDING_DIMENSION_SETTINGS[dimension];
        const metricValue = visualizationSettings[metricSettingId].value;
        const showMultiplier =
          metricValue !== SelectedBuildingMetric.None &&
          isDependencyMet(
            visualizationSettings[multiplierSettingId].dependsOn,
            visualizationSettings
          );

        return (
          <div key={dimension} className="building-config-metric-card">
            <div className="building-config-dimension-header">
              <span className="building-config-dimension-label">{label}</span>
              <span className="building-config-dimension-caption">
                Maps a metric to building {label.toLowerCase()}
              </span>
            </div>
            <SelectSetting
              settingId={metricSettingId}
              onChange={updateSelectSetting}
            />
            {showMultiplier && (
              <RangeSetting
                settingId={multiplierSettingId}
                onChange={updateRangeSetting}
              />
            )}
          </div>
        );
      })}

      <div className="building-config-metric-card">
        <div className="building-config-dimension-header">
          <span className="building-config-dimension-label">Base footprint</span>
          <span className="building-config-dimension-caption">
            Default width and depth when no metric is selected
          </span>
        </div>
        <RangeSetting
          settingId={BUILDING_FOOTPRINT_SETTING_ID}
          onChange={updateRangeSetting}
        />
      </div>
    </div>
  );
}
