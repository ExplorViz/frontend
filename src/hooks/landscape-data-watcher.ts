import { useCallback, useEffect, useRef, useState } from 'react';

import debug from 'debug';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import computeAggregatedCommunication from 'explorviz-frontend/src/utils/city-rendering/communication-computer';
import { areArraysEqual } from 'explorviz-frontend/src/utils/helpers/array-helpers';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  convertToFlatLandscape,
  getAllIdsOfFlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
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
} {
  const log = debug('app:hooks:useLandscapeWatcher');

  const { removedDistrictIds } = useVisualizationStore();

  const [applicationModels, setApplicationModels] = useState<ApplicationData[]>(
    []
  );

  // Variables
  const structureLandscapeData = landscapeData?.structureLandscapeData;
  const dynamicLandscapeData = landscapeData?.dynamicLandscapeData;
  const aggregatedFileCommunication =
    landscapeData?.aggregatedFileCommunication;
  const flatLandscapeData = landscapeData?.flatLandscapeData;

  const lastProcessedDynamicData = useRef<DynamicLandscapeData | null>(null);
  const lastProcessedFlatLandscapeIds = useRef<string[]>([]);

  const updateApplicationData = useCallback(
    async (application: Application, boxLayoutMap: any) => {
      const applicationData = new ApplicationData(application, boxLayoutMap);

      return applicationData;
    },
    [log]
  );

  const handleLandscapeUpdate = useCallback(async () => {
    log('handleLandscapeUpdate');
    await Promise.resolve();
    if (
      !structureLandscapeData ||
      !dynamicLandscapeData ||
      !flatLandscapeData
    ) {
      return;
    }

    const flatLandscapeStructure =
      landscapeData.flatLandscapeData ??
      convertToFlatLandscape(structureLandscapeData);

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
    const aggregatedCommunications = computeAggregatedCommunication(
      flatLandscapeStructure,
      aggregatedFileCommunication!
    );

    // Compute application models
    const applicationModels: ApplicationData[] = [];
    for (let i = 0; i < applications.length; ++i) {
      const applicationData = await updateApplicationData(
        applications[i],
        boxLayoutMap
      );
      if (!removedDistrictIds.has(applicationData.getId())) {
        applicationModels.push(applicationData);
      }
    }

    // TODO: Add data for IDE extension

    document.dispatchEvent(new Event('Landscape initialized'));

    // Add application data to application repository
    const applicationRepository = useApplicationRepositoryStore.getState();
    applicationRepository.cleanup();
    for (const applicationData of applicationModels) {
      applicationRepository.add(applicationData.getId(), applicationData);
    }

    setApplicationModels(applicationModels);

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
    modelRepository.setFunctions(
      Object.values(flatLandscapeStructure.functions)
    );
    modelRepository.setCommunications(aggregatedCommunications);

    // Update layout store after model repository is populated
    useLayoutStore.getState().updateLayouts(boxLayoutMap);
  }, [
    structureLandscapeData,
    dynamicLandscapeData,
    aggregatedFileCommunication,
    landscapeData,
    removedDistrictIds,
    log,
    updateApplicationData,
  ]);

  useEffect(() => {
    if (
      !structureLandscapeData ||
      !dynamicLandscapeData ||
      !flatLandscapeData
    ) {
      return;
    }

    const currentFlatLandscapeIds = getAllIdsOfFlatLandscape(flatLandscapeData);

    const flatChanged = !areArraysEqual(
      currentFlatLandscapeIds,
      lastProcessedFlatLandscapeIds.current
    );

    const dynamicChanged = !areArraysEqual(
      dynamicLandscapeData,
      lastProcessedDynamicData.current
    );

    if (!flatChanged && !dynamicChanged) {
      return;
    }

    lastProcessedDynamicData.current = dynamicLandscapeData;
    lastProcessedFlatLandscapeIds.current = currentFlatLandscapeIds;

    handleLandscapeUpdate();
  }, [
    structureLandscapeData,
    dynamicLandscapeData,
    aggregatedFileCommunication,
    flatLandscapeData,
    handleLandscapeUpdate,
  ]);

  return { applicationModels };
}
