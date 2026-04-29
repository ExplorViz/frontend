import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  isBuilding,
  isCity,
  isDistrict
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import CommunicationLayout from 'explorviz-frontend/src/utils/layout/communication-layout';
import * as THREE from 'three';

export function calculateLineThickness(
  communication: AggregatedCommunication,
  commLineThickness: number
) {
  const normalizedRequestCount = clamp(
    communication.metrics.normalizedRequestCount,
    0.25,
    2.0
  );

  // Apply line thickness depending on request count
  return normalizedRequestCount * commLineThickness;
}

/**
 * Limits a value to a given range
 */
export function clamp(value: number, min: number, max: number) {
  return value > max ? max : value < min ? min : value;
}

export function findFirstEntityWithOpenedParent(entityId: string) {
  const entity = useModelStore.getState().getModel(entityId);
  if (!isDistrict(entity) && !isBuilding(entity)) {
    console.error("Provided entity has unexpected type:", entity);
    return entityId;
  }
  const parentId = entity.parentDistrictId ?? entity.parentDistrictId;
  if (!parentId) {
    console.error("Provided entity has no parent.")
    return entityId;
  }
  const parent = useModelStore.getState().getModel(parentId);
  // Entity is already most outer entity
  if (isCity(parent)) {
    return entityId;
  }
  if (!isDistrict(parent)) {
    console.error("Provided entity has unexpected parent type:", entity);
    return entityId;
  }

  // Parent is closed, inspect parent entity
  if (useVisualizationStore.getState().closedDistrictIds.has(parentId)) {
    return findFirstEntityWithOpenedParent(parentId);
  } else {
    // Found entity with opened parent
    return entityId;
  }

}

export function computeCommunicationLayout(
  communication: AggregatedCommunication,
  applicationModels: ApplicationData[],
  layoutMap: Map<string, BoxLayout>
) {
  const sourceApp = applicationModels.find(
    (app) => app.application.id === communication.sourceEntity.parentCityId
  );
  const targetApp = applicationModels.find(
    (app) => app.application.id === communication.targetEntity.parentCityId
  );

  if (!sourceApp || !layoutMap || !targetApp) {
    return;
  }

  const sourceEntityId = findFirstEntityWithOpenedParent(
    communication.sourceEntity.id
  );
  const targetEntityId = findFirstEntityWithOpenedParent(
    communication.targetEntity.id
  );
  if (!sourceEntityId || !targetEntityId) {
    console.error("Could not find source or target entity for communication.")
    return;
  }

  const sourceEntityLayout = useLayoutStore.getState().getLayout(sourceEntityId);
  const targetEntityLayout = useLayoutStore.getState().getLayout(targetEntityId);
  if(!sourceEntityLayout || !targetEntityLayout) {
    console.error("Could not find source or target layout for communication.")
    return;
  }

  const sourceCity = useModelStore.getState().getCityForModel(sourceEntityId);
  const targetCity =useModelStore.getState().getCityForModel(targetEntityId);

  if (!sourceCity || !targetCity) {
    console.error('Could not find source or target city for communication.');
    return;
  }

  const sourceCityLayout = layoutMap.get(sourceCity.id);
  const targetCityLayout = layoutMap.get(targetCity.id);
  if (!sourceCityLayout || !targetCityLayout) {
    console.error("Could not find source or target city layout for communication.")
    return;
  }

  const startPosition = new THREE.Vector3()
    .copy(sourceCityLayout.position)
    .add(sourceEntityLayout.center);

  const endPosition =new THREE.Vector3().copy(targetCityLayout.position).add(targetEntityLayout.center);

  const commLayout = new CommunicationLayout(communication);
  commLayout.startPoint = startPosition;
  commLayout.endPoint = endPosition;
  commLayout.lineThickness = calculateLineThickness(
    communication,
    useUserSettingsStore.getState().visualizationSettings.commThickness.value
  );

  // Place recursive communication slightly above class
  if (sourceEntityId === targetEntityId) {
    commLayout.startY += 4.0;
    commLayout.endY += 4.0;
  }

  return commLayout;
}
