import React, { useEffect, useState } from 'react';

import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { useApplicationRendererStore } from '../stores/application-renderer';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLandscapeRestructureStore } from '../stores/landscape-restructure';
import { useIdeWebsocketFacadeStore } from '../stores/ide-websocket-facade';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import ApplicationData, { K8sData } from 'explorviz-frontend/src/utils/application-data';
import computeClassCommunication, {
  computeRestructuredClassCommunication,
} from 'explorviz-frontend/src/utils/application-rendering/class-communication-computer';
import calculateHeatmap from 'explorviz-frontend/src/utils/calculate-heatmap';
import {
  Application,
  getApplicationsFromNodes,
  getK8sAppsFromNodes,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { useDetachedMenuRendererStore } from '../stores/extended-reality/detached-menu-renderer';
import { useLocalUserStore } from '../stores/collaboration/local-user';
import { useHighlightingStore } from '../stores/highlighting';
import { useLinkRendererStore } from '../stores/link-renderer';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { useUserSettingsStore } from '../stores/user-settings';
import { useRoomSerializerStore } from '../stores/collaboration/room-serializer';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import { useFontRepositoryStore } from 'explorviz-frontend/src/stores/repos/font-repository';
import visualizeK8sLandscape from 'explorviz-frontend/src/utils/k8s-landscape-visualization-assembler';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import { CommunicationLink } from 'explorviz-frontend/src/ide/ide-cross-communication';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import LandscapeModel from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-model';
import layoutLandscape from 'explorviz-frontend/src/utils/elk-layouter';
import { useShallow } from 'zustand/react/shallow';
import { updateHighlighting } from '../utils/application-rendering/highlighting';

export default function useLandscapeDataWatcher(
  landscapeData: LandscapeData | null,
  landscape3D: Landscape3D
) {
  // MARK: Stores

  const applicationRendererState = useApplicationRendererStore(
    useShallow((state) => ({
      addApplicationTask: state.addApplicationTask,
      restoreFromSerialization: state.restoreFromSerialization,
      getOpenApplicationIds: state.getOpenApplicationIds,
      removeApplicationLocallyById: state.removeApplicationLocallyById,
    }))
  );

  const applicationRepositoryState = useApplicationRepositoryStore(
    useShallow((state) => ({
      applications: state.applications,
      getById: state.getById,
      add: state.add,
    }))
  );

  const landscapeRestructureState = useLandscapeRestructureStore(
    useShallow((state) => ({
      restructureMode: state.restructureMode,
      createdClassCommunication: state.createdClassCommunication,
      copiedClassCommunications: state.copiedClassCommunications,
      updatedClassCommunications: state.updatedClassCommunications,
      completelyDeletedClassCommunications: state.updatedClassCommunications,
      setAllClassCommunications: state.setAllClassCommunications,
      applyTextureMappings: state.applyTextureMappings,
      applyColorMappings: state.applyColorMappings,
    }))
  );

  const linkRendererState = useLinkRendererStore(
    useShallow((state) => ({
      createMeshFromCommunication: state.createMeshFromCommunication,
      updateLinkPosition: state.updateLinkPosition,
    }))
  );

  const roomSerializerState = useRoomSerializerStore(
    useShallow((state) => ({
      serializedRoom: state.serializedRoom,
      setSerializedRoom: state.setSerializedRoom,
    }))
  );

  const highlightingState = useHighlightingStore(
    useShallow((state) => ({
      updateHighlighting: state.updateHighlighting,
    }))
  );

  const detachedMenuRendererState = useDetachedMenuRendererStore(
    useShallow((state) => ({
      restore: state.restore,
      restoreAnnotations: state.restoreAnnotations,
    }))
  );

  const userSettingsState = useUserSettingsStore(
    useShallow((state) => ({
      visualizationSettings: state.visualizationSettings,
      colors: state.colors,
    }))
  );

  const heatmapConfigurationState = useHeatmapConfigurationStore(
    useShallow((state) => ({
      currentApplication: state.currentApplication,
    }))
  );

  const ideWebsocketFacadeState = useIdeWebsocketFacadeStore(
    useShallow((state) => ({
      refreshVizData: state.refreshVizData,
    }))
  );

  // MARK: State

  const [flatDataWorker] = useState<Worker>(
    () => new Worker(new URL('../workers/flat-data-worker.js', import.meta.url))
  );
  const [metricsWorker] = useState<Worker>(
    () => new Worker(new URL('../workers/metrics-worker.js', import.meta.url))
  );

  // MARK: Variables

  const structureLandscapeData = landscapeData?.structureLandscapeData;
  const dynamicLandscapeData = landscapeData?.dynamicLandscapeData;

  // MARK: Event handlers

  const sendMessageToWorker = async (worker: Worker, message: any) => {
    return new Promise<any>((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data);
      worker.onerror = (error) => reject(error);
      worker.postMessage(message);
    });
  };

  const handleUpdatedLandscapeData = async () => {
    await Promise.resolve();
    if (!structureLandscapeData || !dynamicLandscapeData || !landscape3D) {
      return;
    }

    const { nodes } = structureLandscapeData;
    let { k8sNodes } = structureLandscapeData;
    k8sNodes = k8sNodes || [];
    const applications = getApplicationsFromNodes(nodes);
    const k8sAppData = getK8sAppsFromNodes(k8sNodes);

    // Applications might be removed in evolution mode
    if (applications.length !== applicationRepositoryState.applications.size) {
      landscape3D.removeAll();
    }

    const boxLayoutMap = await layoutLandscape(k8sNodes, applications);

    // Set data model for landscape
    const landscapeLayout = boxLayoutMap.get('landscape');
    if (landscapeLayout) {
      landscape3D.dataModel = new LandscapeModel(
        structureLandscapeData,
        dynamicLandscapeData,
        landscapeLayout
      );
    }

    // ToDo: This can take quite some time. Optimize.
    let classCommunications = computeClassCommunication(
      structureLandscapeData,
      dynamicLandscapeData
    );

    if (landscapeRestructureState.restructureMode) {
      classCommunications = computeRestructuredClassCommunication(
        classCommunications,
        landscapeRestructureState.createdClassCommunication,
        landscapeRestructureState.copiedClassCommunications,
        landscapeRestructureState.updatedClassCommunications,
        landscapeRestructureState.completelyDeletedClassCommunications
      );
    }
    landscapeRestructureState.setAllClassCommunications(classCommunications);

    let app3Ds: ApplicationObject3D[] = [];
    // Compute app3Ds which are not part of Kubernetes deployment
    for (let i = 0; i < applications.length; ++i) {
      const applicationData = await updateApplicationData(
        applications[i],
        null,
        classCommunications,
        boxLayoutMap
      );

      // Create or update app3D
      const app3D =
        await applicationRendererState.addApplicationTask(applicationData);

      app3Ds.push(app3D);
    }

    const k8sApp3Ds: ApplicationObject3D[] = [];

    // Add k8sApps
    for(const k8sData of k8sAppData) {
      const applicationData = await updateApplicationData(
        k8sData.app,
        {
          k8sNode: k8sData.k8sNode.name,
          k8sNamespace: k8sData.k8sNamespace.name,
          k8sDeployment: k8sData.k8sDeployment.name,
          k8sPod: k8sData.k8sPod.name,
        },
        classCommunications,
        boxLayoutMap
      );

      const app3D =
        await applicationRendererState.addApplicationTask(applicationData);

      if (!app3D.foundationMesh) {
        console.error('No foundation mesh, this should not happen');
        return;
      }

      k8sApp3Ds.push(app3D);
    }

    const k8sParameters = {
      font: useFontRepositoryStore.getState().font,
      colors: userSettingsState.colors!,
    };

    app3Ds = app3Ds.concat(k8sApp3Ds);
    app3Ds.forEach((application3D) => {
      landscape3D.addApplication(application3D);
    });

    visualizeK8sLandscape(landscape3D, k8sNodes, k8sParameters, boxLayoutMap);

    landscape3D.layoutLandscape(boxLayoutMap);

    // Apply restructure textures in restructure mode
    landscapeRestructureState.applyTextureMappings();

    // Add inter-app communication
    const interAppCommunications = classCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    interAppCommunications.forEach((communication) => {
      const commMesh =
        linkRendererState.createMeshFromCommunication(communication);
      if (commMesh) {
        landscape3D.addCommunication(commMesh);
        linkRendererState.updateLinkPosition(commMesh);
      }
    });

    const serializedRoom = roomSerializerState.serializedRoom;

    // Apply serialized room data from collaboration service if it seems up-to-date
    if (
      serializedRoom &&
      serializedRoom.openApps.length >=
        applicationRepositoryState.applications.size
    ) {
      applicationRendererState.restoreFromSerialization(serializedRoom);
      detachedMenuRendererState.restore(
        serializedRoom.popups,
        serializedRoom.detachedMenus
      );
      detachedMenuRendererState.restoreAnnotations(serializedRoom.annotations!);
      roomSerializerState.setSerializedRoom(undefined);
    } else {
      // Remove possibly outdated applications
      // ToDo: Refactor
      const openApplicationsIds =
        applicationRendererState.getOpenApplicationIds();
      for (let i = 0; i < openApplicationsIds.length; ++i) {
        const applicationId = openApplicationsIds[i];
        const applicationData =
          applicationRepositoryState.getById(applicationId);
        if (!applicationData) {
          applicationRendererState.removeApplicationLocallyById(applicationId);
          landscape3D.app3Ds.delete(applicationId);
        }
      }
      highlightingState.updateHighlighting();
    }

    // Send new data to ide
    const cls: CommunicationLink[] = [];
    landscape3D.getAllInterAppCommunications().forEach((communication) => {
      const meshIDs = communication.getModelId().split('_');
      const tempCL: CommunicationLink = {
        meshID: communication.getModelId(),
        sourceMeshID: meshIDs[0],
        targetMeshID: meshIDs[1],
        methodName: meshIDs[2],
      };
      cls.push(tempCL);
    });
    ideWebsocketFacadeState.refreshVizData(cls);

    // Apply new color for restructured communications in restructure mode
    landscapeRestructureState.applyColorMappings();

    document.dispatchEvent(new Event('Landscape initialized'));
  };

  const updateApplicationData = async (
    application: Application,
    k8sData: K8sData | null,
    classCommunication: ClassCommunication[],
    boxLayoutMap: any
  ) => {
    const workerPayload = {
      structure: application,
      dynamic: dynamicLandscapeData,
    };

    const flatData = await sendMessageToWorker(flatDataWorker, workerPayload);

    let applicationData = applicationRepositoryState.getById(application.id);
    if (applicationData) {
      applicationData.updateApplication(application, boxLayoutMap, flatData);
    } else {
      applicationData = new ApplicationData(
        application,
        boxLayoutMap,
        flatData,
        k8sData
      );
    }

    applicationData.classCommunications = classCommunication.filter(
      (communication) => {
        return (
          communication.sourceApp.id === application.id &&
          communication.targetApp.id === application.id
        );
      }
    );

    if (
      userSettingsState.visualizationSettings.heatmapEnabled &&
      heatmapConfigurationState.currentApplication?.dataModel.application.id ===
        application.id
    ) {
      calculateHeatmap(
        applicationData.applicationMetrics,
        await sendMessageToWorker(metricsWorker, workerPayload)
      );
    }

    applicationRepositoryState.add(
      applicationData.application.id,
      applicationData
    );

    return applicationData;
  };

  useEffect(() => {
    handleUpdatedLandscapeData();
  }, [landscapeData, landscape3D]);

  useEffect(() => {
    return function cleanup() {
      metricsWorker.terminate();
      flatDataWorker.terminate();
    };
  }, []);
}
