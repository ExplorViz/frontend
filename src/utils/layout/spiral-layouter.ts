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
  classCount: number,
  classFootprint: number,
  classMargin: number,
  spiralGap: number,
  spiralCenterOffset: number
): number {
  if (classCount <= 1) {
    return classFootprint * 2;
  }

  const MARGIN_FACTOR = 1.25;
  const sideLength =
    Math.sqrt(
      (classCount + spiralCenterOffset) * (spiralGap + 1) * MARGIN_FACTOR
    ) *
    (classFootprint + classMargin);

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
  const CLASS_FOOTPRINT = vs.classFootprint.value;
  const CLASS_MARGIN = vs.classMargin.value;
  const APP_LABEL_MARGIN = vs.appLabelMargin.value;
  const APP_MARGIN = vs.appMargin.value;
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
        CLASS_FOOTPRINT,
        CLASS_MARGIN,
        SPIRAL_GAP,
        SPIRAL_CENTER_OFFSET
      ) +
      2 * APP_MARGIN;
    appLayout.depth = appLayout.width - APP_MARGIN + APP_LABEL_MARGIN;

    // Calculate spacing between classes (footprint + margin)
    const spacing = CLASS_FOOTPRINT + CLASS_MARGIN;

    // As Label and regular margin can differ, we offset by half the label margin difference
    const zMarginOffset = -APP_LABEL_MARGIN / 2 + APP_MARGIN / 2;

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

      classLayout.width = CLASS_FOOTPRINT;
      classLayout.depth = CLASS_FOOTPRINT;
      classLayout.height = CLASS_FOOTPRINT;
      classLayout.positionY = classLayout.height / 2.0; // Place directly on foundation

      // Calculate position based on current grid coordinates
      const classX = centerX + spiralState.x * spacing - CLASS_FOOTPRINT / 2;
      const classZ = centerZ + spiralState.z * spacing;

      classLayout.positionX = classX;
      classLayout.positionZ = classZ;

      spiralState = advanceInSpiral(spiralState, spiralConfig);

      boxLayoutMap.set(classModel.id, classLayout);
    });
  });
}
