import { useEffect, useState } from 'react';

import debug from 'debug';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData, {
  K8sData,
} from 'explorviz-frontend/src/utils/application-data';
import computeAggregatedCommunication from 'explorviz-frontend/src/utils/city-rendering/communication-computer';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { convertToFlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  Application,
  getAllPackagesAndClassesFromLandscape,
  getApplicationsFromNodes,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import layoutLandscape from 'explorviz-frontend/src/utils/layout/elk-layouter';

export default function useLandscapeDataWatcher(
  landscapeData: LandscapeData | null
): {
  applicationModels: ApplicationData[];
  interAppCommunications: ClassCommunication[];
} {
  const log = debug('app:hooks:useLandscapeWatcher');

  const { removedDistrictIds } = useVisualizationStore();

  const [applicationModels, setApplicationModels] = useState<ApplicationData[]>(
    []
  );
  const [interAppCommunications, setInterAppCommunications] = useState<
    ClassCommunication[]
  >([]);

  // State
  const [flatDataWorker] = useState<Worker>(
    () => new Worker(new URL('../workers/flat-data-worker.js', import.meta.url))
  );
  const [metricsWorker] = useState<Worker>(
    () => new Worker(new URL('../workers/metrics-worker.js', import.meta.url))
  );

  // Variables
  const structureLandscapeData = landscapeData?.structureLandscapeData;
  const dynamicLandscapeData = landscapeData?.dynamicLandscapeData;

  // Event handlers
  const sendMessageToWorker = async (worker: Worker, message: any) => {
    return new Promise<any>((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data);
      worker.onerror = (error) => reject(error);
      worker.postMessage(message);
    });
  };

  const handleUpdatedLandscapeData = async () => {
    log('handleUpdateLandscape');
    await Promise.resolve();
    if (!structureLandscapeData || !dynamicLandscapeData) {
      return;
    }

    const flatLandscapeStructure = convertToFlatLandscape(
      structureLandscapeData
    );

    const { nodes } = structureLandscapeData;

    log('Get applications from nodes');
    const applications = getApplicationsFromNodes(nodes).filter(
      ({ id }) => !removedDistrictIds.has(id)
    );

    log('Layouting landscape ...');
    const boxLayoutMap = await layoutLandscape(
      flatLandscapeStructure,
      removedDistrictIds
    );
    log('Layouted landscape: ', boxLayoutMap);

    // ToDo: This can take quite some time. Optimize.
    log('Compute class communication');
    let classCommunications = computeAggregatedCommunication(
      flatLandscapeStructure,
      dynamicLandscapeData
    );

    // Compute application models
    const applicationModels: ApplicationData[] = [];
    for (let i = 0; i < applications.length; ++i) {
      const applicationData = await updateApplicationData(
        applications[i],
        null,
        classCommunications,
        boxLayoutMap
      );
      if (!removedDistrictIds.has(applicationData.getId())) {
        applicationModels.push(applicationData);
      }
    }

    // Add inter-app communication
    const interAppCommunications = classCommunications.filter(
      (x) =>
        x.sourceApp.id !== x.targetApp.id &&
        !removedDistrictIds.has(x.sourceApp.id) &&
        !removedDistrictIds.has(x.targetApp.id)
    );

    // TODO: Add data for IDE extension

    document.dispatchEvent(new Event('Landscape initialized'));

    // Add application data to application repository
    const applicationRepository = useApplicationRepositoryStore.getState();
    applicationRepository.cleanup();
    for (const applicationData of applicationModels) {
      applicationRepository.add(applicationData.getId(), applicationData);
    }

    setApplicationModels(applicationModels);
    setInterAppCommunications(interAppCommunications);

    // Add data to model repository
    const { packages, classes } = getAllPackagesAndClassesFromLandscape(
      structureLandscapeData
    );
    const modelRepository = useModelStore.getState();
    modelRepository.setApplications(
      applicationModels.map((app) => app.application)
    );
    modelRepository.setCities(Object.values(flatLandscapeStructure.cities));
    modelRepository.setComponents(packages);
    modelRepository.setDistricts(
      Object.values(flatLandscapeStructure.districts)
    );
    modelRepository.setClasses(classes);
    modelRepository.setBuildings(
      Object.values(flatLandscapeStructure.buildings)
    );
    modelRepository.setClses(Object.values(flatLandscapeStructure.classes));
    modelRepository.setFunctions(
      Object.values(flatLandscapeStructure.functions)
    );
    modelRepository.setCommunications(classCommunications);

    // Update layout store after model repository is populated
    useLayoutStore.getState().updateLayouts(boxLayoutMap);
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

    log('Beginn to process flat data.');
    const flatData = await sendMessageToWorker(flatDataWorker, workerPayload);
    log('Finished flat data.');

    let applicationData = new ApplicationData(
      application,
      boxLayoutMap,
      flatData,
      k8sData
    );

    applicationData.classCommunications = classCommunication.filter(
      (communication) => {
        return (
          communication.sourceApp.id === application.id &&
          communication.targetApp.id === application.id
        );
      }
    );

    return applicationData;
  };

  useEffect(() => {
    handleUpdatedLandscapeData();
  }, [landscapeData]);

  useEffect(() => {
    return function cleanup() {
      metricsWorker.terminate();
      flatDataWorker.terminate();
    };
  }, []);

  return { applicationModels, interAppCommunications };
}
