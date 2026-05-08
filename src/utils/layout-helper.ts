import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import * as THREE from 'three';

const ZERO_VECTOR = new THREE.Vector3(0, 0, 0);

/**
 * Computes the world-space center of the landscape.
 */
export function getLandscapeCenterPosition(): THREE.Vector3 {
  const settings = useUserSettingsStore.getState().visualizationSettings;

  const landscapeLayout = useLayoutStore.getState().getLandscapeLayout();
  if (!landscapeLayout) {
    console.warn('Landscape layout not found.');
    return ZERO_VECTOR.clone();
  }

  const {
    landscapeScalar,
    landscapePositionX,
    landscapePositionY,
    landscapePositionZ,
    openedDistrictHeight,
  } = settings;

  const landscapeOffset = new THREE.Vector3(
    landscapePositionX.value,
    landscapePositionY.value,
    landscapePositionZ.value
  );

  const landscapeCenter = new THREE.Vector3(
    -landscapeLayout.width / 2,
    -openedDistrictHeight.value * 2, // due to elk-layouting
    -landscapeLayout.depth / 2
  );

  return landscapeCenter
    .multiplyScalar(landscapeScalar.value)
    .add(landscapeOffset);
}

/**
 * Computes the world-space position of a specific model (city, district, or building)
 * based on the current layout and landscape settings.
 */
export function getWorldPositionOfModel(
  modelId: string
): THREE.Vector3 | undefined {
  // Check is model is a communication
  if (useModelStore.getState().getCommunication(modelId)) {
    return getWorldPositionOfCommunication(modelId);
  }
  const layoutStore = useLayoutStore.getState();

  const modelLayout = layoutStore.getLayout(modelId);
  const city = useModelStore.getState().getCityForModel(modelId);
  if (!city) return undefined;
  const cityLayout = layoutStore.getLayout(city.id);
  const landscapeLayout = layoutStore.landscapeLayout;

  if (!modelLayout || !cityLayout || !landscapeLayout) {
    console.warn(`Some layout missing for model ID "${modelId}".`);
    return undefined;
  }

  const landscapeScalar =
    useUserSettingsStore.getState().visualizationSettings.landscapeScalar.value;

  const cityPosition = cityLayout.position
    .clone()
    .multiplyScalar(landscapeScalar);

  let modelPosition: THREE.Vector3 | undefined;

  // Case that model is city
  if (useModelStore.getState().cities[modelId]) {
    modelPosition = new THREE.Vector3(
      modelLayout.width / 2,
      0,
      modelLayout.depth / 2
    ).multiplyScalar(landscapeScalar);
  } else {
    modelPosition = modelLayout.center.clone().multiplyScalar(landscapeScalar);
  }

  return getLandscapeCenterPosition().add(cityPosition).add(modelPosition);
}

/**
 * Computes the landscape-space position of a specific model (city, district, or building)
 * based on the current layout and landscape settings. Unlike getWorldPositionOfModel,
 * this returns the position relative to the landscape coordinate system (without the landscape center offset).
 */
export function getLandscapePositionOfModel(
  modelId: string
): THREE.Vector3 | undefined {
  // Check is model is a communication
  if (useModelStore.getState().getCommunication(modelId)) {
    return getLandscapePositionOfCommunication(modelId);
  }
  const modelStore = useModelStore.getState();
  const settings = useUserSettingsStore.getState().visualizationSettings;
  const layoutStore = useLayoutStore.getState();

  const cityForModel = modelStore.getCityForModel(modelId);
  if (!cityForModel) {
    console.warn(`No city found for model ID "${modelId}".`);
    return undefined;
  }

  const { landscapeScalar } = settings;
  const landscapeLayout = layoutStore.landscapeLayout;

  if (!landscapeLayout) {
    console.warn('Landscape layout missing.');
    return undefined;
  }

  const cityLayout = layoutStore.getLayout(cityForModel.id);
  if (!cityLayout) {
    console.warn(`City layout missing for model ID "${modelId}".`);
    return undefined;
  }

  const cityPosition = cityLayout.position
    .clone()
    .multiplyScalar(landscapeScalar.value);

  const isModelCity = modelId === cityForModel.id;
  let modelPosition: THREE.Vector3 | undefined;

  if (isModelCity) {
    const modelLayout = layoutStore.getLayout(modelId);
    if (!modelLayout) return undefined;
    modelPosition = new THREE.Vector3(
      modelLayout.width / 2,
      0,
      modelLayout.depth / 2
    ).multiplyScalar(landscapeScalar.value);
  } else {
    const modelLayout = layoutStore.getLayout(modelId);
    if (!modelLayout) return undefined;
    modelPosition = modelLayout.center
      .clone()
      .multiplyScalar(landscapeScalar.value);
  }

  return cityPosition.add(modelPosition);
}

export function getLandscapePositionOfCommunication(
  communicationId: string
): THREE.Vector3 {
  const modelStore = useModelStore.getState();
  const userSettings = useUserSettingsStore.getState().visualizationSettings;

  const communication = modelStore.getCommunication(communicationId);
  if (!(communication instanceof AggregatedCommunication)) {
    console.warn(
      `[getLandscapePositionOfCommunication] Invalid communication ID: ${communicationId}`
    );
    return new THREE.Vector3();
  }

  const sourcePos = getLandscapePositionOfModel(communication.sourceEntity.id);
  const targetPos = getLandscapePositionOfModel(communication.targetEntity.id);

  if (!sourcePos || !targetPos) {
    console.warn(
      `[getLandscapePositionOfCommunication] Missing source or target model position for communication: ${communicationId}`
    );
    return new THREE.Vector3();
  }

  // Calculate midpoint between source and target (same as communication-r3f.tsx)
  const midpoint = sourcePos.clone().add(targetPos).multiplyScalar(0.5);

  // Calculate height based on distance and settings
  const commCurveHeightDependsOnDistance =
    userSettings.commCurveHeightDependsOnDistance?.value ?? true;
  const curvyCommHeight = userSettings.curvyCommHeight?.value ?? 5.0;

  const horizontalDistance = Math.hypot(
    targetPos.x - sourcePos.x,
    targetPos.z - sourcePos.z
  );

  let baseCurveHeight = 50;
  if (commCurveHeightDependsOnDistance) {
    baseCurveHeight = horizontalDistance * 0.1;
  }

  const computedCurveHeight = baseCurveHeight * curvyCommHeight;

  midpoint.y = computedCurveHeight / 2;

  return midpoint;
}

/**
 * Batch-computes world-space positions for a list of entity IDs.
 *
 * Unlike calling `getWorldPositionOfModel` in a loop, this function reads each
 * Zustand store **once** and re-uses the landscape center offset for every
 * entity, eliminating O(n) redundant store accesses and Vector3 allocations.
 *
 * Returns a packed Float32Array [x0,y0,z0, x1,y1,z1, …] together with the
 * subset of entity IDs that had a valid layout (communications are skipped).
 * The returned buffer is exactly `validEntityIds.length * 3` floats long.
 */
export function getWorldPositionsForEntities(entityIds: string[]): {
  positions: Float32Array;
  validEntityIds: string[];
} {
  if (entityIds.length === 0) {
    return { positions: new Float32Array(0), validEntityIds: [] };
  }

  // Read each store exactly once
  const layoutStore = useLayoutStore.getState();
  const modelStore = useModelStore.getState();
  const landscapeScalar =
    useUserSettingsStore.getState().visualizationSettings.landscapeScalar.value;

  if (!layoutStore.landscapeLayout) {
    return { positions: new Float32Array(0), validEntityIds: [] };
  }

  // Compute landscape center once (not per entity)
  const lc = getLandscapeCenterPosition();
  const lcx = lc.x;
  const lcy = lc.y;
  const lcz = lc.z;

  // Allocate an upper-bound buffer; we'll slice to the actual count at the end
  const buf = new Float32Array(entityIds.length * 3);
  const validEntityIds: string[] = [];
  let count = 0;

  for (const entityId of entityIds) {
    // Communications are not visualized as positioned entities in the city
    if (modelStore.getCommunication(entityId)) continue;

    // Use the pre-built fullLayoutMap for a single O(1) lookup per entity
    const modelLayout = layoutStore.fullLayoutMap.get(entityId);
    const city = modelStore.getCityForModel(entityId);
    if (!city) continue;

    const cityLayout = layoutStore.fullLayoutMap.get(city.id);
    if (!modelLayout || !cityLayout) continue;

    const cityX = cityLayout.positionX * landscapeScalar;
    const cityY = cityLayout.positionY * landscapeScalar;
    const cityZ = cityLayout.positionZ * landscapeScalar;

    let modelX: number;
    let modelY: number;
    let modelZ: number;

    if (modelStore.cities[entityId]) {
      // Entity is a city: use its own dimensions for the center
      modelX = (modelLayout.width / 2) * landscapeScalar;
      modelY = 0;
      modelZ = (modelLayout.depth / 2) * landscapeScalar;
    } else {
      // District or building: use the box center (positionX + width/2, …)
      modelX =
        (modelLayout.positionX + modelLayout.width / 2) * landscapeScalar;
      modelY =
        (modelLayout.positionY + modelLayout.height / 2) * landscapeScalar;
      modelZ =
        (modelLayout.positionZ + modelLayout.depth / 2) * landscapeScalar;
    }

    buf[count * 3] = lcx + cityX + modelX;
    buf[count * 3 + 1] = lcy + cityY + modelY;
    buf[count * 3 + 2] = lcz + cityZ + modelZ;

    validEntityIds.push(entityId);
    count++;
  }

  return {
    // slice creates a new buffer of exactly the right size so the caller
    // can safely transfer it to a Web Worker
    positions: buf.slice(0, count * 3),
    validEntityIds,
  };
}

export function getWorldPositionOfCommunication(
  communicationId: string
): THREE.Vector3 {
  const modelStore = useModelStore.getState();
  const userSettings = useUserSettingsStore.getState().visualizationSettings;

  const communication = modelStore.getCommunication(communicationId);
  if (!(communication instanceof AggregatedCommunication)) {
    console.warn(
      `[getWorldPositionOfCommunication] Invalid communication ID: ${communicationId}`
    );
    return new THREE.Vector3();
  }

  const sourcePos = getWorldPositionOfModel(communication.sourceEntity.id);
  const targetPos = getWorldPositionOfModel(communication.targetEntity.id);

  if (!sourcePos || !targetPos) {
    console.warn(
      `[getWorldPositionOfCommunication] Missing source or target model position for communication: ${communicationId}`
    );
    return new THREE.Vector3();
  }

  // Calculate midpoint between source and target (same as communication-r3f.tsx)
  const midpoint = sourcePos.clone().add(targetPos).multiplyScalar(0.5);

  // Calculate height based on distance and settings
  const commCurveHeightDependsOnDistance =
    userSettings.commCurveHeightDependsOnDistance?.value ?? true;
  const curvyCommHeight = userSettings.curvyCommHeight?.value ?? 5.0;

  const horizontalDistance = Math.hypot(
    targetPos.x - sourcePos.x,
    targetPos.z - sourcePos.z
  );

  let baseCurveHeight = 50;
  if (commCurveHeightDependsOnDistance) {
    baseCurveHeight = horizontalDistance * 0.1;
  }

  const computedCurveHeight = baseCurveHeight * curvyCommHeight;

  midpoint.y = computedCurveHeight / 2;

  return midpoint;
}
