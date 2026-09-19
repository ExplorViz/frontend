import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  FlatLandscapeEntityType,
  ModelType,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { getLabelForModelType } from 'explorviz-frontend/src/utils/model-type-utils';
import { CSSProperties } from 'react';
import { Badge } from 'react-bootstrap';

interface ModelTypeBadgeProps {
  type: ModelType | undefined;

  /**
   * The kind of flat landscape model to which this badge refers.
   * This value is used to determine the color in which the badge should be displayed,
   * since different kinds of models can set different color overrides per model type.
   */
  flatEntityType: FlatLandscapeEntityType;

  pill?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Displays a badge indicating a {@link ModelType} value. The badge's color is set
 * to match a particular kind of entity (building, city, district) with that type value.
 */
export default function ModelTypeBadge({
  type,
  flatEntityType,
  pill,
  className,
  style,
}: ModelTypeBadgeProps) {
  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const districtColor = useUserSettingsStore(
    (state) => state.visualizationSettings.districtRootLevelColor
  );
  const cityColor = useUserSettingsStore(
    (state) => state.visualizationSettings.foundationColor
  );
  const buildingColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColorOverrides
  );
  const districtColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.districtColorOverrides
  );
  const cityColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.cityColorOverrides
  );

  const color =
    flatEntityType === 'building'
      ? buildingColor.value
      : flatEntityType === 'district'
        ? districtColor.value
        : cityColor.value;

  const overrides =
    flatEntityType === 'building'
      ? buildingColorOverrides.value
      : flatEntityType === 'district'
        ? districtColorOverrides.value
        : cityColorOverrides.value;

  const badgeColor = overrides.modelType[type ?? 'unknown'] ?? color;

  return (
    <Badge
      bg=""
      pill={pill ?? true}
      className={className}
      style={{
        backgroundColor: badgeColor,
        color: `contrast-color(${badgeColor})`,
        ...style,
      }}
    >
      <samp>{getLabelForModelType(type ?? 'unknown')}</samp>
    </Badge>
  );
}
