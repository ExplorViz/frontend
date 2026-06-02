import { VisualizationSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export const BUILDING_METRIC_MAPPING_SETTING_ID =
  'buildingMetricMapping' as const satisfies VisualizationSettingId;

export const BUILDING_FOOTPRINT_SETTING_ID =
  'buildingFootprint' as const satisfies VisualizationSettingId;

export type BuildingDimension = 'width' | 'depth' | 'height';

type BuildingDimensionConfig = {
  label: string;
  metricSettingId: VisualizationSettingId;
  multiplierSettingId: VisualizationSettingId;
};

export const BUILDING_DIMENSION_SETTINGS: Record<
  BuildingDimension,
  BuildingDimensionConfig
> = {
  width: {
    label: 'Width',
    metricSettingId: 'buildingWidthMetric',
    multiplierSettingId: 'buildingWidthMultiplier',
  },
  depth: {
    label: 'Depth',
    metricSettingId: 'buildingDepthMetric',
    multiplierSettingId: 'buildingDepthMultiplier',
  },
  height: {
    label: 'Height',
    metricSettingId: 'buildingHeightMetric',
    multiplierSettingId: 'buildingHeightMultiplier',
  },
};

export const BUILDING_DIMENSION_ORDER: BuildingDimension[] = [
  'width',
  'depth',
  'height',
];
