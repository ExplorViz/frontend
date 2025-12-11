import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { getAllClassesInApplication } from './application-helpers';
import { Application, Package } from './landscape-schemes/structure-data';
import { metricMappingMultipliers } from './settings/default-settings';
import { SelectedClassMetric } from './settings/settings-schemas';

// Constants for class node creation (matching elk-layouter.ts)
const CLASS_PREFIX = 'clss-';

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
 * Collects all classes from a package and its sub-packages recursively.
 * Creates ELK graph nodes for each class, skipping packages.
 */
export function collectAllClassesForCircleLayout(
  pkg: Package,
  classNodes: any[],
  removedComponentIds: Set<string>
) {
  pkg.classes.forEach((classModel) => {
    if (removedComponentIds.has(classModel.id)) {
      return;
    }
    let widthByMetric = 0;
    if (WIDTH_METRIC === SelectedClassMetric.Method) {
      widthByMetric =
        WIDTH_METRIC_MULTIPLIER *
        metricMappingMultipliers['Method Count'] *
        classModel.methods.length;
    }

    let depthByMetric = 0;
    if (DEPTH_METRIC === SelectedClassMetric.Method) {
      depthByMetric =
        DEPTH_METRIC_MULTIPLIER *
        metricMappingMultipliers['Method Count'] *
        classModel.methods.length;
    }

    const classNode = {
      id: CLASS_PREFIX + classModel.id,
      children: [],
      width: CLASS_FOOTPRINT + widthByMetric,
      height: CLASS_FOOTPRINT + depthByMetric,
    };
    classNodes.push(classNode);
  });

  pkg.subPackages.forEach((subPackage) => {
    if (!removedComponentIds.has(subPackage.id)) {
      collectAllClassesForCircleLayout(
        subPackage,
        classNodes,
        removedComponentIds
      );
    }
  });
}

/**
 * Collects all classes from an application for circle layout.
 * Returns an array of ELK graph nodes for all classes in the application.
 */
export function collectApplicationClassesForCircleLayout(
  application: Application,
  removedComponentIds: Set<string>
): any[] {
  const allClassNodes: any[] = [];
  application.packages.forEach((component) => {
    if (!removedComponentIds.has(component.id)) {
      collectAllClassesForCircleLayout(
        component,
        allClassNodes,
        removedComponentIds
      );
    }
  });
  return allClassNodes;
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
  applications: Application[],
  removedComponentIds: Set<string>
) {
  setCircleLayoutSettings();
  applications.forEach((application) => {
    if (removedComponentIds.has(application.id)) {
      return;
    }

    // Get application layout to determine circle size
    const appLayout = boxLayoutMap.get(application.id);
    if (!appLayout) {
      return;
    }

    // Get all classes in this application
    const classes = getAllClassesInApplication(application).filter(
      (classModel) => !removedComponentIds.has(classModel.id)
    );

    if (classes.length === 0) {
      return;
    }

    // Calculate circle radius based on application size and label margins
    const appWidth = appLayout.width;
    const appDepth = appLayout.depth;
    const radius =
      Math.min(appWidth, appDepth) * 0.5 -
      CLASS_FOOTPRINT -
      Math.max(APP_LABEL_MARGIN, APP_MARGIN);

    // Arrange classes in a circle with equal angular spacing
    const angleStep = (2 * Math.PI) / classes.length;

    classes.forEach((classModel, index) => {
      const classLayout = boxLayoutMap.get(classModel.id);
      if (!classLayout) {
        return;
      }

      // As Label and regular margin can differ, we offset by half the label margin difference
      const zMarginOffset = -APP_LABEL_MARGIN / 2 + APP_MARGIN / 2;

      if (classes.length === 1) {
        // If there is only one class, place it at the center of the application
        classLayout.positionX = appLayout.width / 2;
        classLayout.positionZ = appLayout.depth / 2 + zMarginOffset;
        return;
      }

      const classAngle = index * angleStep;

      const classX = radius * Math.cos(classAngle) + appLayout.width / 2;
      const classZ =
        radius * Math.sin(classAngle) + appLayout.depth / 2 + zMarginOffset;

      classLayout.positionX = classX;
      classLayout.positionZ = classZ;
    });
  });
}
