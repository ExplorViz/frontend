import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import CommunicationLayout from 'explorviz-frontend/src/utils/layout/communication-layout';
import * as THREE from 'three';

export function calculateLineThickness(
  communication: ClassCommunication | ComponentCommunication,
  commLineThickness: number
) {
  // Normalized request count might be above 1 for component communication
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

export function findFirstOpen(
  app: Application,
  entity: Package | Class
): Package | Class {
  const parentComponent = entity.parent;

  if (!parentComponent) return entity;

  // Check open status in corresponding component mesh
  const isParentOpen = !useVisualizationStore
    .getState()
    .closedComponentIds.has(parentComponent.id);
  if (isParentOpen) {
    return entity;
  }

  // Recursive call
  return findFirstOpen(app, parentComponent);
}

export function computeCommunicationLayout(
  communication: ClassCommunication | ComponentCommunication,
  applicationModels: ApplicationData[],
  layoutMap: Map<string, BoxLayout>
) {
  const sourceApp = applicationModels.find(
    (app) => app.application.id === communication.sourceApp.id
  );
  const targetApp = applicationModels.find(
    (app) => app.application.id === communication.targetApp.id
  );

  if (!sourceApp || !layoutMap || !targetApp) {
    return;
  }

  let sourceClass, targetClass;

  if (communication instanceof ClassCommunication) {
    sourceClass = communication.sourceClass;
    targetClass = communication.targetClass;
  } else {
    sourceClass = communication.sourceEntity;
    targetClass = communication.targetEntity;
  }
  if (communication instanceof ClassCommunication) {
    sourceClass = findFirstOpen(
      sourceApp.application,
      communication.sourceClass
    );
    targetClass = findFirstOpen(
      targetApp.application,
      communication.targetClass
    );
  } else {
    sourceClass = findFirstOpen(
      sourceApp.application,
      communication.sourceEntity
    );
    targetClass = findFirstOpen(
      targetApp.application,
      communication.targetEntity
    );
  }

  const sourceAppLayout = layoutMap.get(sourceApp.getId());
  const sourceClassLayout = layoutMap.get(sourceClass.id);
  if (!sourceAppLayout || !sourceClassLayout) return;

  let start = new THREE.Vector3()
    .copy(sourceAppLayout.position)
    .add(sourceClassLayout.center);

  const targetAppLayout = layoutMap.get(targetApp.getId());
  const targetClassLayout = layoutMap.get(targetClass.id);
  if (!targetAppLayout || !targetClassLayout) return;
  let end = new THREE.Vector3()
    .copy(targetAppLayout.position)
    .add(targetClassLayout.center);

  if (sourceApp.getId() === targetApp.getId()) {
    start = sourceClassLayout.center;
    end = targetClassLayout.center;
  }

  const commLayout = new CommunicationLayout(communication);
  commLayout.startPoint = start;
  commLayout.endPoint = end;
  commLayout.lineThickness = calculateLineThickness(
    communication,
    useUserSettingsStore.getState().visualizationSettings.commThickness.value
  );

  // Place recursive communication slightly above class
  if (sourceClass.id === targetClass.id) {
    commLayout.startY += 4.0;
    commLayout.endY += 4.0;
  }

  return commLayout;
}
