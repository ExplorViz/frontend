import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getAllClassesInApplication } from 'explorviz-frontend/src/utils/application-helpers';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';

type SpiralState = {
  x: number;
  z: number;
  direction: number;
  stepsRemaining: number;
  segmentLength: number;
  segmentCount: number;
  segmentAddition: number;
};

type SpiralConfig = {
  segmentAddition: number;
};

function advanceInSpiral(
  spiralState: SpiralState,
  spiralConfig: SpiralConfig,
  advanceSteps: number = 1
) {
  for (let i = 0; i < advanceSteps; i++) {
    if (spiralState.stepsRemaining > 0) {
      // Move in current direction
      switch (spiralState.direction) {
        case 0: // Right
          spiralState.x++;
          break;
        case 1: // Down
          spiralState.z++;
          break;
        case 2: // Left
          spiralState.x--;
          break;
        case 3: // Up
          spiralState.z--;
          break;
      }
      spiralState.stepsRemaining--;

      // If we've completed this segment, change direction
      if (spiralState.stepsRemaining === 0) {
        spiralState.direction = (spiralState.direction + 1) % 4;
        spiralState.segmentCount++;

        // Increase segment length every 2 segments (after right+down or left+up)
        if (spiralState.segmentCount % 2 === 0) {
          spiralState.segmentLength += spiralConfig.segmentAddition;
        }

        spiralState.stepsRemaining = spiralState.segmentLength;
      }
    }
  }
  return spiralState;
}

/**
 * Calculates the required size for an application to fit a spiral layout.
 * Returns the rough side length needed to accommodate all classes in the spiral pattern.
 */
export function calculateSpiralSideLength(
  buildingCount: number,
  buildingFootprint: number,
  buildingMargin: number,
  spiralGap: number,
  spiralCenterOffset: number
): number {
  if (buildingCount <= 1) {
    return buildingFootprint * 2;
  }

  const MARGIN_FACTOR = 1.25;
  const sideLength =
    Math.sqrt(
      (buildingCount + spiralCenterOffset) * (spiralGap + 1) * MARGIN_FACTOR
    ) *
    (buildingFootprint + buildingMargin);

  return sideLength;
}

/**
 * Arranges classes in a snake-like spiral pattern for each application.
 * This function modifies the BoxLayout positions for classes to be arranged
 * in a grid-based spiral pattern where each class has consistent spacing to its neighbors,
 * similar to the game Snake.
 * Note: Class positions are stored relative to the application (0,0 is the app center).
 */
export function applySpiralLayoutToClasses(
  boxLayoutMap: Map<string, BoxLayout>,
  applications: Application[]
) {
  // Get settings from the store
  const { visualizationSettings: vs } = useUserSettingsStore.getState();
  const BUILDING_FOOTPRINT = vs.buildingFootprint.value;
  const BUILDING_MARGIN = vs.buildingMargin.value;
  const DISTRICT_HEIGHT = vs.openedDistrictHeight.value;
  const CITY_LABEL_MARGIN = vs.cityLabelMargin.value;
  const CITY_MARGIN = vs.cityMargin.value;
  const SPIRAL_CENTER_OFFSET = vs.spiralCenterOffset.value;
  const SPIRAL_GAP = vs.spiralGap.value;

  applications.forEach((application) => {
    // Get application layout to determine spiral size
    const appLayout = boxLayoutMap.get(application.id);
    if (!appLayout) {
      return;
    }

    // Get all classes in this application
    const classes = getAllClassesInApplication(application).sort(
      (classA, classB) => classA.fqn!.localeCompare(classB.fqn!)
    );

    if (classes.length === 0) {
      return;
    }

    appLayout.width =
      calculateSpiralSideLength(
        classes.length,
        BUILDING_FOOTPRINT,
        BUILDING_MARGIN,
        SPIRAL_GAP,
        SPIRAL_CENTER_OFFSET
      ) +
      2 * CITY_MARGIN;
    appLayout.depth = appLayout.width - CITY_MARGIN + CITY_LABEL_MARGIN;

    // Calculate spacing between classes (footprint + margin)
    const spacing = BUILDING_FOOTPRINT + BUILDING_MARGIN;

    // As Label and regular margin can differ, we offset by half the label margin difference
    const zMarginOffset = -CITY_LABEL_MARGIN / 2 + CITY_MARGIN / 2;

    if (classes.length === 1) {
      // If there is only one class, place it at the center of the application
      const classLayout = boxLayoutMap.get(classes[0].id);
      if (classLayout) {
        classLayout.positionX = appLayout.width / 2;
        classLayout.positionZ = appLayout.depth / 2 + zMarginOffset;
      }
      return;
    }

    // Calculate grid dimensions for snake-like spiral
    // Start from center and spiral outward
    // Apply center offset to shift the starting position
    const centerX = appLayout.width / 2;
    const centerZ = appLayout.depth / 2 + zMarginOffset;

    let spiralConfig: SpiralConfig = {
      segmentAddition: SPIRAL_GAP + 1,
    };
    let spiralState: SpiralState = {
      x: 0,
      z: 0,
      direction: 0,
      stepsRemaining: 1,
      segmentLength: 1,
      segmentCount: 0,
      segmentAddition: SPIRAL_GAP,
    };

    spiralState = advanceInSpiral(
      spiralState,
      spiralConfig,
      SPIRAL_CENTER_OFFSET
    );

    classes.forEach((classModel, _) => {
      const classLayout = new BoxLayout();

      classLayout.width = BUILDING_FOOTPRINT;
      classLayout.depth = BUILDING_FOOTPRINT;
      classLayout.height = BUILDING_FOOTPRINT;
      classLayout.positionY = DISTRICT_HEIGHT * 2; // Place directly on foundation

      // Calculate position based on current grid coordinates
      const classX = centerX + spiralState.x * spacing - BUILDING_FOOTPRINT / 2;
      const classZ = centerZ + spiralState.z * spacing;

      classLayout.positionX = classX;
      classLayout.positionZ = classZ;

      spiralState = advanceInSpiral(spiralState, spiralConfig);

      boxLayoutMap.set(classModel.id, classLayout);
    });
  });
}
