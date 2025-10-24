import { useEffect, useState } from 'react';

import debug from 'debug';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import ApplicationData, {
  K8sData,
} from 'explorviz-frontend/src/utils/application-data';
import computeClassCommunication from 'explorviz-frontend/src/utils/application-rendering/class-communication-computer';
import layoutLandscape from 'explorviz-frontend/src/utils/elk-layouter';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  Application,
  getAllPackagesAndClassesFromLandscape,
  getApplicationsFromNodes,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export default function useLandscapeDataWatcher(
  landscapeData: LandscapeData | null
): {
  applicationModels: ApplicationData[];
  interAppCommunications: ClassCommunication[];
} {
  const log = debug('app:hooks:useLandscapeWatcher');

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

    const { nodes } = structureLandscapeData;
    // TODO: Handle k8s nodes

    log('Get applications from nodes');
    const applications = getApplicationsFromNodes(nodes);

    log('Layouting landscape ...');
    const boxLayoutMap = await layoutLandscape([], applications);
    log('Layouted landscape.');

    // ToDo: This can take quite some time. Optimize.
    log('Compute class communication');
    let classCommunications = computeClassCommunication(
      structureLandscapeData,
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

      applicationModels.push(applicationData);
    }

    // Add inter-app communication
    const interAppCommunications = classCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
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
    modelRepository.setComponents(packages);
    modelRepository.setClasses(classes);
    modelRepository.setCommunications(classCommunications);
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
