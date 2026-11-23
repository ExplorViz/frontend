import { VisualizationSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';

/**
 * Settings that change the size of entities or the spacing between them.
 * Changing one invalidates every place the stable layout remembered, so the
 * landscape is packed afresh.
 */
export const ARRANGEMENT_SETTING_IDS: readonly VisualizationSettingId[] = [
  'buildingDepthMetric',
  'buildingDepthMultiplier',
  'buildingFootprint',
  'buildingLayoutAlgorithm',
  'buildingMargin',
  'buildingMetricBuckets',
  'buildingMetricMapping',
  'buildingWidthMetric',
  'buildingWidthMultiplier',
  'cityAspectRatio',
  'cityGeometryOverrides',
  'cityLabelMargin',
  'cityMargin',
  'cityPadding',
  'districtLabelMargin',
  'districtLabelPlacement',
  'districtPadding',
  'spiralCenterOffset',
  'spiralGap',
];

/**
 * The layout options: every setting that decides where Cities, Districts and
 * Buildings are and how large their footprints are. In a Room the Host
 * decides them for everyone.
 */
export const LAYOUT_SETTING_IDS: readonly VisualizationSettingId[] = [
  ...ARRANGEMENT_SETTING_IDS,
  'layoutEngine',
  'cityLayoutAlgorithm',
  'districtLayoutAlgorithm',
  'cityDistance',
  'openedDistrictHeight',
  'closedDistrictHeight',
];

const LAYOUT_SETTING_ID_SET: ReadonlySet<string> = new Set(LAYOUT_SETTING_IDS);

export function isLayoutSetting(settingId: string): boolean {
  return LAYOUT_SETTING_ID_SET.has(settingId);
}
