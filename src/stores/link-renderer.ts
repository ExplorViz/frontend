import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import { calculateLineThickness } from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
import * as THREE from 'three';
import { create } from 'zustand';
import { useUserSettingsStore } from './user-settings';

interface LinkRendererState {
  linkIdToMesh: Map<string, ClazzCommunicationMesh>;
  findFirstOpen(app: Application, entity: Package | Class): Package | Class;
  computeCommunicationLayout: (
    communication: ClassCommunication | ComponentCommunication,
    applicationModels: ApplicationData[]
  ) => CommunicationLayout | undefined;
  getLinkById: (linkId: string) => ClazzCommunicationMesh | undefined;
}

export const useLinkRendererStore = create<LinkRendererState>((set, get) => ({
  linkIdToMesh: new Map(),

  getAllLinks: () => {
    return Array.from(get().linkIdToMesh.values());
  },

  findFirstOpen(app: Application, entity: Package | Class): Package | Class {
    const parentComponent = entity.parent;

    if (!parentComponent) return entity;

    // Check open status in corresponding component mesh
    const parentState = useVisualizationStore
      .getState()
      .actions.getComponentState(parentComponent.id);
    if (parentState.isOpen) {
      return entity;
    }

    // Recursive call
    return get().findFirstOpen(app, parentComponent);
  },

  computeCommunicationLayout(
    communication: ClassCommunication | ComponentCommunication,
    applicationModels: ApplicationData[]
  ) {
    const sourceApp = applicationModels.find(
      (app) => app.application.id === communication.sourceApp.id
    );
    const targetApp = applicationModels.find(
      (app) => app.application.id === communication.targetApp.id
    );

    if (
      !sourceApp ||
      !sourceApp.boxLayoutMap ||
      !targetApp ||
      !targetApp.boxLayoutMap
    ) {
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
      sourceClass = get().findFirstOpen(
        sourceApp.application,
        communication.sourceClass
      );
      targetClass = get().findFirstOpen(
        targetApp.application,
        communication.targetClass
      );
    } else {
      sourceClass = get().findFirstOpen(
        sourceApp.application,
        communication.sourceEntity
      );
      targetClass = get().findFirstOpen(
        targetApp.application,
        communication.targetEntity
      );
    }

    const sourceAppLayout = sourceApp.boxLayoutMap.get(sourceApp.getId());
    const sourceClassLayout = sourceApp.boxLayoutMap.get(sourceClass.id);
    if (!sourceAppLayout || !sourceClassLayout) return;

    let start = new THREE.Vector3()
      .copy(sourceAppLayout.position)
      .add(sourceClassLayout.position);

    const targetAppLayout = targetApp.boxLayoutMap.get(targetApp.getId());
    const targetClassLayout = targetApp.boxLayoutMap.get(targetClass.id);
    if (!targetAppLayout || !targetClassLayout) return;
    let end = new THREE.Vector3()
      .copy(targetAppLayout.position)
      .add(targetClassLayout.position);

    if (sourceApp.getId() === targetApp.getId()) {
      start = sourceClassLayout.position;
      end = targetClassLayout.position;
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
  },

  getLinkById: (linkId: string) => {
    return get().linkIdToMesh.get(linkId);
  },
}));
