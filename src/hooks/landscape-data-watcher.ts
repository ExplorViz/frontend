import { useCallback, useEffect, useRef } from 'react';

import debug from 'debug';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  calculateAggregatedCommunications,
  computeBuildingCommunication,
} from 'explorviz-frontend/src/utils/city-rendering/communication-computer';
import { areArraysEqual } from 'explorviz-frontend/src/utils/helpers/array-helpers';
import { getAllIdsOfFlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import layoutLandscape from 'explorviz-frontend/src/utils/layout/elk-layouter';
import { tryApplyPendingSerializedRoom } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';

export default function useLandscapeDataWatcher(
  landscapeData: LandscapeData | null
) {
  const log = debug('app:hooks:useLandscapeWatcher');

  const { removedDistrictIds } = useVisualizationStore();

  // Variables
  const dynamicLandscapeData = landscapeData?.dynamicLandscapeData;
  const aggregatedFileCommunication =
    landscapeData?.aggregatedFileCommunication;
  const flatLandscapeData = landscapeData?.flatLandscapeData;

  const lastProcessedDynamicData = useRef<DynamicLandscapeData | null>(null);
  const lastProcessedFlatLandscapeIds = useRef<string[]>([]);
  const lastProcessedLandscapeData = useRef<LandscapeData | null>(null);
  const layoutGenerationRef = useRef(0);

  const handleLandscapeUpdate = useCallback(async () => {
    const generation = ++layoutGenerationRef.current;
    log('handleLandscapeUpdate');
    await Promise.resolve();
    if (!dynamicLandscapeData || !flatLandscapeData) {
      return;
    }

    const flatLandscapeStructure = landscapeData.flatLandscapeData;

    log('Layouting landscape ...');
    const boxLayoutMap = await layoutLandscape(
      flatLandscapeStructure,
      removedDistrictIds
    );
    if (generation !== layoutGenerationRef.current) {
      return;
    }
    log('Layouted landscape: ', boxLayoutMap);

    log('Compute building communication');
    const buildingCommunications = computeBuildingCommunication(
      flatLandscapeStructure,
      aggregatedFileCommunication
    );

    // Add data to model repository
    useModelStore.getState().setAllModels({
      cities: Object.values(flatLandscapeStructure.cities),
      districts: Object.values(flatLandscapeStructure.districts),
      buildings: Object.values(flatLandscapeStructure.buildings),
      buildingCommunications: buildingCommunications,
    });

    calculateAggregatedCommunications(buildingCommunications);

    // Update layout store after model repository is populated
    useLayoutStore.getState().updateLayouts(boxLayoutMap);

    tryApplyPendingSerializedRoom();
  }, [
    dynamicLandscapeData,
    aggregatedFileCommunication,
    landscapeData,
    removedDistrictIds,
    log,
  ]);

  useEffect(() => {
    if (!dynamicLandscapeData || !flatLandscapeData) {
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

    const landscapeChanged =
      landscapeData !== lastProcessedLandscapeData.current;

    if (!flatChanged && !dynamicChanged) {
      if (landscapeChanged) {
        lastProcessedLandscapeData.current = landscapeData;
        useModelStore
          .getState()
          .setBuildings(Object.values(flatLandscapeData.buildings));
      }
      return;
    }

    lastProcessedLandscapeData.current = landscapeData;
    lastProcessedDynamicData.current = dynamicLandscapeData;
    lastProcessedFlatLandscapeIds.current = currentFlatLandscapeIds;

    handleLandscapeUpdate();
  }, [
    dynamicLandscapeData,
    aggregatedFileCommunication,
    flatLandscapeData,
    handleLandscapeUpdate,
  ]);
}
