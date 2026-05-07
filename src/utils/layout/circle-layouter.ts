import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  City,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Application,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';

let CITY_LABEL_MARGIN: number;
let CITY_MARGIN: number;
let BUILDING_FOOTPRINT: number;
let WIDTH_METRIC: string;
let WIDTH_METRIC_MULTIPLIER: number;
let DEPTH_METRIC: string;
let DEPTH_METRIC_MULTIPLIER: number;
let DISTRICT_HEIGHT: number;
/**
 * Sets the visualization settings needed for circle layout.
 * This should be called before using circle layout functions.
 */
export function setCircleLayoutSettings() {
  const { visualizationSettings: vs } = useUserSettingsStore.getState();
  BUILDING_FOOTPRINT = vs.buildingFootprint.value;
  WIDTH_METRIC = vs.buildingWidthMetric.value;
  WIDTH_METRIC_MULTIPLIER = vs.buildingWidthMultiplier.value;
  DEPTH_METRIC = vs.buildingDepthMetric.value;
  DEPTH_METRIC_MULTIPLIER = vs.buildingDepthMultiplier.value;
  CITY_LABEL_MARGIN = vs.cityLabelMargin.value;
  CITY_MARGIN = vs.cityMargin.value;
  DISTRICT_HEIGHT = vs.openedDistrictHeight.value;
}

/**
 * Collects all package IDs from an application recursively.
 * Used to remove package layouts from the layout map when circle layout is enabled.
 */
export function collectPackageIds(
  application: Application,
  removedComponentIds: Set<string>
): Set<string> {
  const packageIds = new Set<string>();

  function collectPackageIdsRecursive(pkg: Package) {
    if (!removedComponentIds.has(pkg.id)) {
      packageIds.add(pkg.id);
    }
    pkg.subPackages.forEach(collectPackageIdsRecursive);
  }

  application.packages.forEach(collectPackageIdsRecursive);
  return packageIds;
}

/**
 * Arranges classes in a circle for each application.
 * This function modifies the BoxLayout positions for classes to be arranged
 * in a circle centered at the application center.
 * Note: Class positions are stored relative to the application (0,0 is the app center).
 */
export function applyCircleLayoutToClasses(
  boxLayoutMap: Map<string, BoxLayout>,
  flatLandscape: FlatLandscape,
  cities: City[]
) {
  setCircleLayoutSettings();
  cities.forEach((city) => {
    // Get city layout to determine circle size
    const cityLayout = boxLayoutMap.get(city.id);
    if (!cityLayout) {
      return;
    }

    // Get all buildings in city and sort by fqn
    const buildings = city.allContainedBuildingIds
      .map((id) => flatLandscape.buildings[id])
      .filter((building) => building !== undefined)
      .sort((a, b) => (a.fqn ?? a.name).localeCompare(b.fqn ?? b.name));

    if (buildings.length === 0) {
      return;
    }

    // Calculate circle radius based on city size and label margins
    const appWidth = cityLayout.width;
    const appDepth = cityLayout.depth;
    const radius =
      Math.min(appWidth, appDepth) * 0.5 -
      BUILDING_FOOTPRINT / 2 -
      Math.max(CITY_LABEL_MARGIN, CITY_MARGIN);

    // Arrange buildings in a circle with equal angular spacing
    const angleStep = (2 * Math.PI) / buildings.length;

    buildings.forEach((building, index) => {
      const classLayout = new BoxLayout();

      classLayout.width = BUILDING_FOOTPRINT;
      classLayout.depth = BUILDING_FOOTPRINT;
      classLayout.height = BUILDING_FOOTPRINT;
      classLayout.positionY = DISTRICT_HEIGHT * 2; // Place directly on foundation

      // As Label and regular margin can differ, we offset by half the label margin difference
      const zMarginOffset = -CITY_LABEL_MARGIN / 2 + CITY_MARGIN / 2;

      if (buildings.length === 1) {
        // If there is only one building, place it at the center of the city
        classLayout.positionX = cityLayout.width / 2;
        classLayout.positionZ = cityLayout.depth / 2 + zMarginOffset;
        return;
      }

      const classAngle = index * angleStep;

      const classX =
        radius * Math.cos(classAngle) +
        cityLayout.width / 2 -
        BUILDING_FOOTPRINT / 2;
      const classZ =
        radius * Math.sin(classAngle) + cityLayout.depth / 2 + zMarginOffset;

      classLayout.positionX = classX;
      classLayout.positionZ = classZ;

      boxLayoutMap.set(building.id, classLayout);
    });
  });
}
