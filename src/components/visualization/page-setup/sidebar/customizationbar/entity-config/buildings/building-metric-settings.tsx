import { LinkIcon, UnlinkIcon } from '@primer/octicons-react';
import RangeSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/range-setting';
import SelectSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/select-setting';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  BUILDING_DIMENSION_SETTINGS,
  BUILDING_FOOTPRINT_SETTING_ID,
  BUILDING_METRIC_MAPPING_SETTING_ID,
  BuildingDimension,
} from 'explorviz-frontend/src/utils/settings/building-config-settings';
import { formatBuildingMetricDisplayName } from 'explorviz-frontend/src/utils/settings/building-metrics';
import {
  SelectedBuildingMetric,
  SettingDependency,
  VisualizationSettingId,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useState } from 'react';
import { Button } from 'react-bootstrap';

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

function formatBuildingMetricOptionLabel(
  option: unknown,
  isCommitComparisonMode: boolean
): string {
  return formatBuildingMetricDisplayName(
    option as SelectedBuildingMetric,
    isCommitComparisonMode
  );
}

function areWidthAndDepthLinkedByDefault(
  settings: VisualizationSettings
): boolean {
  const widthMetric = settings.buildingWidthMetric.value;
  const depthMetric = settings.buildingDepthMetric.value;
  const widthMultiplier = settings.buildingWidthMultiplier.value;
  const depthMultiplier = settings.buildingDepthMultiplier.value;

  return widthMetric === depthMetric && widthMultiplier === depthMultiplier;
}

function DimensionMetricCard({
  dimension,
  isCommitComparisonMode,
  onMetricChange,
  onMultiplierChange,
}: {
  dimension: BuildingDimension;
  isCommitComparisonMode: boolean;
  onMetricChange: (settingId: VisualizationSettingId, value: unknown) => void;
  onMultiplierChange: (
    settingId: VisualizationSettingId,
    value: number
  ) => void;
}) {
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
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
    <div className="building-config-metric-card">
      <div className="building-config-dimension-header">
        <span className="building-config-dimension-label">{label}</span>
        <span className="building-config-dimension-caption">
          Maps a metric to building {label.toLowerCase()}
        </span>
      </div>
      <SelectSetting
        settingId={metricSettingId}
        onChange={onMetricChange}
        formatOptionLabel={(option) =>
          formatBuildingMetricOptionLabel(option, isCommitComparisonMode)
        }
      />
      {showMultiplier && (
        <RangeSetting
          settingId={multiplierSettingId}
          onChange={onMultiplierChange}
        />
      )}
    </div>
  );
}

export default function BuildingMetricSettings() {
  const currentSelectedRepo = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );
  const selectedCommitCount =
    useCommitTreeStateStore(
      (state) => state._selectedCommits.get(currentSelectedRepo)?.length
    ) ?? 0;
  const isCommitComparisonMode = selectedCommitCount >= 2;

  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const updateUserSetting = useUserSettingsStore(
    (state) => state.updateSetting
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [areWidthDepthLinked, setAreWidthDepthLinked] = useState(() =>
    areWidthAndDepthLinkedByDefault(
      useUserSettingsStore.getState().visualizationSettings
    )
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

  const updateLinkedMetricSetting = (
    name: VisualizationSettingId,
    value: unknown
  ) => {
    updateSelectSetting(name, value);

    if (!areWidthDepthLinked) {
      return;
    }

    if (name === 'buildingWidthMetric') {
      updateSelectSetting('buildingDepthMetric', value);
    } else if (name === 'buildingDepthMetric') {
      updateSelectSetting('buildingWidthMetric', value);
    }
  };

  const updateLinkedMultiplierSetting = (
    name: VisualizationSettingId,
    value: number
  ) => {
    updateRangeSetting(name, value);

    if (!areWidthDepthLinked) {
      return;
    }

    if (name === 'buildingWidthMultiplier') {
      updateRangeSetting('buildingDepthMultiplier', value);
    } else if (name === 'buildingDepthMultiplier') {
      updateRangeSetting('buildingWidthMultiplier', value);
    }
  };

  const toggleWidthDepthLink = () => {
    if (areWidthDepthLinked) {
      setAreWidthDepthLinked(false);
      return;
    }

    // Sync depth to width so both stay identical after linking.
    const widthMetric = visualizationSettings.buildingWidthMetric.value;
    const widthMultiplier = visualizationSettings.buildingWidthMultiplier.value;
    updateSelectSetting('buildingDepthMetric', widthMetric);
    updateRangeSetting('buildingDepthMultiplier', widthMultiplier);
    setAreWidthDepthLinked(true);
  };

  return (
    <div className="building-config-metrics">
      <p className="building-config-section-description">
        Choose which code and social activity metrics control building size. Use
        multipliers to fine tune the visual scale.
        {isCommitComparisonMode &&
          ' With two commits selected, dimensions reflect the absolute difference between the commits.'}
      </p>

      <div className="building-config-metric-card">
        <SelectSetting
          settingId={BUILDING_METRIC_MAPPING_SETTING_ID}
          onChange={updateSelectSetting}
        />
      </div>

      <div
        className={`building-config-dimension-link-group${
          areWidthDepthLinked
            ? ' building-config-dimension-link-group--linked'
            : ''
        }`}
      >
        <DimensionMetricCard
          dimension="width"
          isCommitComparisonMode={isCommitComparisonMode}
          onMetricChange={updateLinkedMetricSetting}
          onMultiplierChange={updateLinkedMultiplierSetting}
        />

        <div className="building-config-dimension-link">
          <div
            className="building-config-dimension-link-line"
            aria-hidden="true"
          />
          <Button
            type="button"
            variant={areWidthDepthLinked ? 'primary' : 'outline-secondary'}
            size="sm"
            className="building-config-dimension-link-button"
            onClick={toggleWidthDepthLink}
            aria-pressed={areWidthDepthLinked}
            aria-label={
              areWidthDepthLinked
                ? 'Unlink width and depth settings'
                : 'Link width and depth settings'
            }
            title={
              areWidthDepthLinked
                ? 'Width and depth are linked. Click to unlink.'
                : 'Link width and depth so they stay in sync.'
            }
          >
            {areWidthDepthLinked ? (
              <LinkIcon size={16} />
            ) : (
              <UnlinkIcon size={16} />
            )}
            <span>{areWidthDepthLinked ? 'Linked' : 'Unlinked'}</span>
          </Button>
          <div
            className="building-config-dimension-link-line"
            aria-hidden="true"
          />
        </div>

        <DimensionMetricCard
          dimension="depth"
          isCommitComparisonMode={isCommitComparisonMode}
          onMetricChange={updateLinkedMetricSetting}
          onMultiplierChange={updateLinkedMultiplierSetting}
        />
      </div>

      <DimensionMetricCard
        dimension="height"
        isCommitComparisonMode={isCommitComparisonMode}
        onMetricChange={updateSelectSetting}
        onMultiplierChange={updateRangeSetting}
      />

      <div className="building-config-metric-card">
        <div className="building-config-dimension-header">
          <span className="building-config-dimension-label">
            Base footprint
          </span>
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
