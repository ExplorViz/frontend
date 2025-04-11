import { create } from 'zustand';
import { calculateLineThickness } from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { findFirstOpen } from 'explorviz-frontend/src/utils/link-helper';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
import * as THREE from 'three';
import { useApplicationRendererStore } from './application-renderer';
import { useConfigurationStore } from './configuration';
import { useUserSettingsStore } from './user-settings';
import { VisualizationSettings } from '../utils/settings/settings-schemas';
import SemanticZoomManager from '../view-objects/3d/application/utils/semantic-zoom-manager';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';

interface LinkRendererState {
  linkIdToMesh: Map<string, ClazzCommunicationMesh>;
  addLinkIdToMesh: (id: string, newMesh: ClazzCommunicationMesh) => void;
  _flag: boolean;
  appSettings: () => VisualizationSettings;
  getAllLinks: () => ClazzCommunicationMesh[];
  updateLinkPosition: (line: ClazzCommunicationMesh) => true | undefined;
  updateLinkPositions: () => void;
  createMeshFromCommunication: (
    classCommunication: ClassCommunication
  ) => ClazzCommunicationMesh | undefined;
  getLinkById: (linkId: string) => ClazzCommunicationMesh | undefined;
  _computeCurveHeight: (commLayout: CommunicationLayout) => number;
  _addArrows: (pipe: ClazzCommunicationMesh, curveHeight: number) => void;
  setFlag: (flag: boolean) => void;
}

export const useLinkRendererStore = create<LinkRendererState>((set, get) => ({
  linkIdToMesh: new Map(),
  addLinkIdToMesh,
  _flag: false,

  setFlag: (flag: boolean) => {
    set({ _flag: flag });
  },

  appSettings: () => {
    return useUserSettingsStore.getState().visualizationSettings;
  },

  getAllLinks: () => {
    return Array.from(get().linkIdToMesh.values());
  },

  updateLinkPosition: (line: ClazzCommunicationMesh) => {
    const sourceApp = useApplicationRendererStore
      .getState()
      .getApplicationById(line.dataModel.communication.sourceApp.id);
    const targetApp = useApplicationRendererStore
      .getState()
      .getApplicationById(line.dataModel.communication.targetApp.id);

    if (
      !(sourceApp instanceof ApplicationObject3D) ||
      !(targetApp instanceof ApplicationObject3D)
    ) {
      return;
    }

    const classCommunication = line.dataModel.communication;

    line.visible = useConfigurationStore.getState().isCommRendered;
    const landscapeGroup = sourceApp.parent!;

    let sourceClass, targetClass;

    if (classCommunication instanceof ClassCommunication) {
      sourceClass = findFirstOpen(sourceApp, classCommunication.sourceClass);
      targetClass = findFirstOpen(sourceApp, classCommunication.targetClass);
    } else {
      sourceClass = findFirstOpen(sourceApp, classCommunication.sourceEntity);
      targetClass = findFirstOpen(sourceApp, classCommunication.targetEntity);
    }

    const sourceMesh = sourceApp.getBoxMeshByModelId(sourceClass.id);
    if (
      !(sourceMesh instanceof ClazzMesh || sourceMesh instanceof ComponentMesh)
    ) {
      console.error(
        `Cannot find source mesh for ${sourceClass.id} in ${sourceApp.id}`
      );
      return;
    }

    let start = new THREE.Vector3()
      .copy(sourceApp.layout.position)
      .add(sourceMesh.layout.position);

    const targetMesh = targetApp.getBoxMeshByModelId(targetClass.id);
    if (
      !(targetMesh instanceof ClazzMesh || targetMesh instanceof ComponentMesh)
    ) {
      console.error(
        `Cannot find source mesh for ${sourceClass.id} in ${sourceApp.id}`
      );
      return;
    }
    let end = new THREE.Vector3()
      .copy(targetApp.layout.position)
      .add(targetMesh.layout.position);

    // Add arrow
    const commLayout = new CommunicationLayout(classCommunication);
    commLayout.startPoint = start;
    commLayout.endPoint = end;
    commLayout.lineThickness = calculateLineThickness(
      classCommunication,
      useUserSettingsStore.getState().visualizationSettings
    );
    line.layout = commLayout;
    line.geometry.dispose();

    const curveHeight = get()._computeCurveHeight(commLayout);
    line.render(curveHeight);

    get()._addArrows(line, curveHeight);
    // SemanticZoomManager: save the original appearence
    line.saveOriginalAppearence();
    line.saveCurrentlyActiveLayout();
    return true;
  },

  updateLinkPositions: () => {
    get().linkIdToMesh.forEach((link) => {
      get().updateLinkPosition(link);
    });
  },

  createMeshFromCommunication: (
    classCommunication: ClassCommunication
  ): ClazzCommunicationMesh | undefined => {
    const applicationObject3D = useApplicationRendererStore
      .getState()
      .getApplicationById(classCommunication.sourceApp.id);
    if (!applicationObject3D) return;
    const { id } = classCommunication;

    const clazzCommuMeshData = new ClazzCommuMeshDataModel(
      applicationObject3D.dataModel.application,
      classCommunication,
      id
    );
    const { communicationColor, highlightedEntityColor } =
      useUserSettingsStore.getState().colors!;

    let newLinkIdToMesh = get().linkIdToMesh;
    const existingMesh = newLinkIdToMesh.get(classCommunication.id);
    if (existingMesh) {
      existingMesh.dataModel = clazzCommuMeshData;
      set({ linkIdToMesh: newLinkIdToMesh });
      return existingMesh;
    }
    const newMesh = new ClazzCommunicationMesh(
      // Note: Parameter layout is not used here
      new CommunicationLayout(clazzCommuMeshData.communication),
      clazzCommuMeshData,
      communicationColor,
      highlightedEntityColor
    );
    newLinkIdToMesh = get().linkIdToMesh;
    newLinkIdToMesh.set(id, newMesh);
    get().addLinkIdToMesh(id, newMesh);

    return newMesh;
  },

  getLinkById: (linkId: string) => {
    return get().linkIdToMesh.get(linkId);
  },

  _computeCurveHeight: (commLayout: CommunicationLayout) => {
    let baseCurveHeight = 20;

    if (useConfigurationStore.getState().commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        commLayout.endX - commLayout.startX,
        commLayout.endZ - commLayout.startZ
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * get().appSettings().curvyCommHeight.value;
  },

  _addArrows: (pipe: ClazzCommunicationMesh, curveHeight: number) => {
    pipe.children.forEach((child) => {
      if (child instanceof CommunicationArrowMesh) {
        pipe.remove(child);
        child.disposeRecursively(SemanticZoomManager);
      }
    });

    const arrowOffset = get().appSettings().commArrowOffset.value;
    const arrowHeight = curveHeight / 2 + arrowOffset;
    const arrowThickness = get().appSettings().commArrowSize.value;
    const arrowColor =
      useUserSettingsStore.getState().colors!.communicationArrowColor;

    if (arrowThickness > 0.0) {
      pipe.addArrows(arrowThickness, arrowHeight, arrowColor);
    }

    if (pipe.material.opacity !== 1) {
      // This fixes the problem that every arrow gets opaque (even for transparent pipes) after receiving onTimestampUpdate messages
      pipe.children.forEach((child) => {
        if (child instanceof CommunicationArrowMesh)
          child.turnTransparent(pipe.material.opacity);
      });
    }
  },
}));

function addLinkIdToMesh(id: string, newMesh: ClazzCommunicationMesh) {
  useLinkRendererStore.setState((prev) => ({
    linkIdToMesh: new Map(prev.linkIdToMesh).set(id, newMesh),
  }));
}
