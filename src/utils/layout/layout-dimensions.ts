import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Building, City, District, FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  getCityLabelFontSize,
  getTextWidth,
  MIN_CITY_LABEL_MARGIN,
} from 'explorviz-frontend/src/utils/layout/label-utils';
import { calculateSpiralSideLength, countCityBuildings } from 'explorviz-frontend/src/utils/layout/spiral-layouter';
import {
  applyMetricMapping,
  getBuildingMetricValueForSizing,
  getMetricMappingMultiplier,
  MetricBounds,
  MetricKey,
} from 'explorviz-frontend/src/utils/settings/building-metrics';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

/**
 * Sizing rules shared by all layouters, so that a City, District or Building
 * gets the same footprint no matter which layout engine arranges it.
 */

export const MINIMUM_CITY_WIDTH = 50;
export const MINIMUM_CITY_HEIGHT = 50;

export type Padding = { top: number; left: number; bottom: number; right: number };

/**
 * The inner padding of a City or District: The side the label is placed on
 * reserves the label margin, all others the base margin.
 */
export function getPaddingForLabelPlacement(labelPlacement: string, labelMargin: number, baseMargin: number): Padding {
  return {
    top: labelPlacement === 'top' ? labelMargin : baseMargin,
    left: labelPlacement === 'left' ? labelMargin : baseMargin,
    bottom: labelPlacement === 'bottom' ? labelMargin : baseMargin,
    right: labelPlacement === 'right' ? labelMargin : baseMargin,
  };
}

/**
 * Computes the minimum size a city needs such that its
 * label fits without overlapping the borders. The label runs along the side
 * given by the label placement: For top/bottom it needs width, for left/right
 * it needs depth (when the label is rotated).
 */
function getMinimumSizeForLabel(
  name: string,
  fontSize: number,
  margin: number,
  labelPlacement: string,
  minimumSize: { width: number; height: number }
): { width: number; height: number } {
  let { width, height } = minimumSize;

  // Reserve some space for the annotation icon which can be appended to the name
  const labelWidth = getTextWidth(name, fontSize) + getTextWidth(' 📝', fontSize);
  const neededSpaceForLabel = labelWidth + 2 * margin;
  if (labelPlacement === 'left' || labelPlacement === 'right') {
    height = Math.max(height, neededSpaceForLabel);
  } else {
    width = Math.max(width, neededSpaceForLabel);
  }

  return { width, height };
}

/**
 * The minimum footprint of a City. `height` is the extent along the z axis
 * (ELK's notion of height).
 */
export function getMinimumCitySize(city: City, vs: VisualizationSettings): { width: number; height: number } {
  const minimumSize = {
    width: MINIMUM_CITY_WIDTH,
    height: MINIMUM_CITY_HEIGHT,
  };

  const cityLabelMargin = vs.cityLabelMargin.value;
  if (cityLabelMargin <= MIN_CITY_LABEL_MARGIN) {
    return minimumSize;
  }

  const minimumLabelSize = getMinimumSizeForLabel(
    city.name,
    getCityLabelFontSize(cityLabelMargin),
    vs.cityPadding.value,
    vs.districtLabelPlacement.value,
    minimumSize
  );

  // Geometry overrides can only be applied to empty cities
  // since layouting of city contents relies on box layout
  if (city.districtIds.length === 0 && city.buildingIds.length === 0) {
    const geometryOverride = vs.cityGeometryOverrides.value.modelType[city.type];

    if (geometryOverride === 'Cylinder') {
      // Cylinder should always have a 1:1 aspect ratio,
      // so we change the minimum size to reflect this
      const edgeSize = Math.max(minimumLabelSize.width, minimumLabelSize.height);
      return { width: edgeSize, height: edgeSize };
    }
  }

  return minimumLabelSize;
}

/**
 * Whether the Buildings of each City are arranged by a custom building layout
 * (circle or spiral) instead of within their Districts.
 */
export function usesCustomBuildingLayout(vs: VisualizationSettings): boolean {
  const algorithm = vs.buildingLayoutAlgorithm.value;
  return algorithm === 'circle' || algorithm === 'spiral';
}

/**
 * Footprint of a City whose Buildings are arranged by a custom building layout
 * (circle or spiral). The Buildings are placed into this footprint afterwards.
 */
export function getCustomBuildingLayoutCitySize(
  landscape: FlatLandscape,
  city: City,
  vs: VisualizationSettings
): { width: number; depth: number } {
  const buildingCount = countCityBuildings(landscape, city);
  const buildingFootprint = vs.buildingFootprint.value;
  const buildingMargin = vs.buildingMargin.value;

  let citySideLength: number;
  if (vs.buildingLayoutAlgorithm.value === 'circle') {
    const circumference = buildingCount * (buildingFootprint * 2 + buildingMargin * 2);
    citySideLength = buildingCount <= 2 ? buildingFootprint * 4 : circumference / Math.PI;
  } else {
    citySideLength = calculateSpiralSideLength(
      buildingCount,
      buildingFootprint,
      buildingMargin,
      vs.spiralGap.value,
      vs.spiralCenterOffset.value
    );
  }

  const minimumSize = getMinimumCitySize(city, vs);
  return {
    width: Math.max(citySideLength, minimumSize.width),
    depth: Math.max(citySideLength, minimumSize.height),
  };
}

export type BuildingSizing = {
  vs: VisualizationSettings;
  widthBounds: MetricBounds;
  depthBounds: MetricBounds;
};

/**
 * Footprint of a Building: the base footprint plus the mapped width and depth
 * metrics.
 */
export function getBuildingFootprint(building: Building, sizing: BuildingSizing): { width: number; depth: number } {
  const { vs, widthBounds, depthBounds } = sizing;
  const metricMapping = vs.buildingMetricMapping.value;
  const metricBuckets = vs.buildingMetricBuckets.value;
  const widthMetric = vs.buildingWidthMetric.value;
  const depthMetric = vs.buildingDepthMetric.value;

  const widthByMetric =
    vs.buildingWidthMultiplier.value *
    getMetricMappingMultiplier(widthMetric as MetricKey, metricMapping) *
    applyMetricMapping(
      getBuildingMetricValueForSizing(building, widthMetric),
      metricMapping,
      widthBounds,
      metricBuckets
    );

  const depthByMetric =
    vs.buildingDepthMultiplier.value *
    getMetricMappingMultiplier(depthMetric as MetricKey, metricMapping) *
    applyMetricMapping(
      getBuildingMetricValueForSizing(building, depthMetric),
      metricMapping,
      depthBounds,
      metricBuckets
    );

  return {
    width: vs.buildingFootprint.value + widthByMetric,
    depth: vs.buildingFootprint.value + depthByMetric,
  };
}

export function hasVisibleBuildingsRecursively(
  landscape: FlatLandscape,
  district: District,
  removedDistrictIds: Set<string>
): boolean {
  const hasDirectBuildings = district.buildingIds.some((buildingId) => !!landscape.buildings[buildingId]);
  if (hasDirectBuildings) {
    return true;
  }

  return district.districtIds.some((childDistrictId) => {
    if (removedDistrictIds.has(childDistrictId)) {
      return false;
    }
    const childDistrict = landscape.districts[childDistrictId];
    if (!childDistrict) {
      return false;
    }
    return hasVisibleBuildingsRecursively(landscape, childDistrict, removedDistrictIds);
  });
}

export function getVisualizationSettings(): VisualizationSettings {
  return useUserSettingsStore.getState().visualizationSettings;
}
