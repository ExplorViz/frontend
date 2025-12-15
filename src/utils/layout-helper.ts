import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import * as THREE from 'three';

const ZERO_VECTOR = new THREE.Vector3(0, 0, 0);

/**
 * Computes the world-space center of the landscape.
 */
export function getLandscapeCenterPosition(): THREE.Vector3 {
  const appRepo = useApplicationRepositoryStore.getState();
  const settings = useUserSettingsStore.getState().visualizationSettings;

  const allApps = Array.from(appRepo.getAll());
  if (allApps.length === 0) {
    console.warn('No application data available.');
    return ZERO_VECTOR.clone();
  }

  const landscapeLayout = allApps[0]?.boxLayoutMap.get('landscape');
  if (!landscapeLayout) {
    console.warn('Landscape layout not found.');
    return ZERO_VECTOR.clone();
  }

  const {
    landscapeScalar,
    landscapePositionX,
    landscapePositionY,
    landscapePositionZ,
  } = settings;

  const landscapeOffset = new THREE.Vector3(
    landscapePositionX.value,
    landscapePositionY.value,
    landscapePositionZ.value
  );

  const landscapeCenter = new THREE.Vector3(
    -landscapeLayout.width / 2,
    0,
    -landscapeLayout.depth / 2
  );

  return landscapeCenter
    .multiplyScalar(landscapeScalar.value)
    .add(landscapeOffset);
}

/**
 * Computes the world-space position of a specific model (application, package, or class)
 * based on the current layout and landscape settings.
 */
export function getWorldPositionOfModel(
  modelId: string
): THREE.Vector3 | undefined {
  // Check is model is a communication
  if (modelId.indexOf('_') !== -1) {
    return getWorldPositionOfCommunication(modelId);
  }
  const appRepo = useApplicationRepositoryStore.getState();
  const settings = useUserSettingsStore.getState().visualizationSettings;

  const applicationData = appRepo.getByModelId(modelId);
  if (!applicationData) {
    console.warn(`No application found for model ID "${modelId}".`);
    return undefined;
  }

  const { landscapeScalar } = settings;
  const layoutMap = applicationData.boxLayoutMap;
  const landscapeLayout = layoutMap.get('landscape');

  if (!landscapeLayout) {
    console.warn(`Landscape layout missing for model ID "${modelId}".`);
    return undefined;
  }

  const appLayout = layoutMap.get(applicationData.getId());
  if (!appLayout) {
    console.warn(`Application layout missing for model ID "${modelId}".`);
    return undefined;
  }

  const appPosition = appLayout.position
    .clone()
    .multiplyScalar(landscapeScalar.value);

  const isModelApplication = modelId === applicationData.getId();
  let modelPosition: THREE.Vector3 | undefined;

  if (isModelApplication) {
    const modelLayout = layoutMap.get(modelId);
    if (!modelLayout) return undefined;
    modelPosition = new THREE.Vector3(
      modelLayout.width / 2,
      0,
      modelLayout.depth / 2
    ).multiplyScalar(landscapeScalar.value);
  } else {
    const modelLayout = layoutMap.get(modelId);
    if (!modelLayout) return undefined;
    modelPosition = modelLayout.position
      .clone()
      .multiplyScalar(landscapeScalar.value);
  }

  return getLandscapeCenterPosition().add(appPosition).add(modelPosition);
}

export function getWorldPositionOfCommunication(
  communicationId: string
): THREE.Vector3 {
  const modelStore = useModelStore.getState();
  const userSettings = useUserSettingsStore.getState().visualizationSettings;

  const communication = modelStore.getCommunication(communicationId);
  if (!(communication instanceof ClassCommunication)) {
    console.warn(
      `[getWorldPositionOfCommunication] Invalid communication ID: ${communicationId}`
    );
    return new THREE.Vector3();
  }

  const sourcePos = getWorldPositionOfModel(communication.sourceClass.id);
  const targetPos = getWorldPositionOfModel(communication.targetClass.id);

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
