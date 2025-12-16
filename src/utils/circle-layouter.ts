import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { getAllClassesInApplication } from './application-helpers';
import { Application, Package } from './landscape-schemes/structure-data';

let APP_LABEL_MARGIN: number;
let APP_MARGIN: number;
let CLASS_FOOTPRINT: number;
let WIDTH_METRIC: string;
let WIDTH_METRIC_MULTIPLIER: number;
let DEPTH_METRIC: string;
let DEPTH_METRIC_MULTIPLIER: number;

/**
 * Sets the visualization settings needed for circle layout.
 * This should be called before using circle layout functions.
 */
export function setCircleLayoutSettings() {
  const { visualizationSettings: vs } = useUserSettingsStore.getState();
  CLASS_FOOTPRINT = vs.classFootprint.value;
  WIDTH_METRIC = vs.classWidthMetric.value;
  WIDTH_METRIC_MULTIPLIER = vs.classWidthMultiplier.value;
  DEPTH_METRIC = vs.classDepthMetric.value;
  DEPTH_METRIC_MULTIPLIER = vs.classDepthMultiplier.value;
  APP_LABEL_MARGIN = vs.appLabelMargin.value;
  APP_MARGIN = vs.appMargin.value;
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
  applications: Application[]
) {
  setCircleLayoutSettings();
  applications.forEach((application) => {
    // Get application layout to determine circle size
    const appLayout = boxLayoutMap.get(application.id);
    if (!appLayout) {
      return;
    }

    // Get all classes in applications and sort by fqn
    const classes = getAllClassesInApplication(application).sort(
      (classA, classB) => classA.fqn!.localeCompare(classB.fqn!)
    );

    if (classes.length === 0) {
      return;
    }

    // Calculate circle radius based on application size and label margins
    const appWidth = appLayout.width;
    const appDepth = appLayout.depth;
    const radius =
      Math.min(appWidth, appDepth) * 0.5 -
      CLASS_FOOTPRINT / 2 -
      Math.max(APP_LABEL_MARGIN, APP_MARGIN);

    // Arrange classes in a circle with equal angular spacing
    const angleStep = (2 * Math.PI) / classes.length;

    classes.forEach((classModel, index) => {
      const classLayout = new BoxLayout();

      classLayout.width = CLASS_FOOTPRINT;
      classLayout.depth = CLASS_FOOTPRINT;
      classLayout.height = CLASS_FOOTPRINT;
      classLayout.positionY = classLayout.height / 2.0; // Place directly on foundation

      // As Label and regular margin can differ, we offset by half the label margin difference
      const zMarginOffset = -APP_LABEL_MARGIN / 2 + APP_MARGIN / 2;

      if (classes.length === 1) {
        // If there is only one class, place it at the center of the application
        classLayout.positionX = appLayout.width / 2;
        classLayout.positionZ = appLayout.depth / 2 + zMarginOffset;
        return;
      }

      const classAngle = index * angleStep;

      const classX =
        radius * Math.cos(classAngle) +
        appLayout.width / 2 -
        CLASS_FOOTPRINT / 2;
      const classZ =
        radius * Math.sin(classAngle) + appLayout.depth / 2 + zMarginOffset;

      classLayout.positionX = classX;
      classLayout.positionZ = classZ;

      boxLayoutMap.set(classModel.id, classLayout);
    });
  });
}
