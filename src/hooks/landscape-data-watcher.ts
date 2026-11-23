import { useCallback, useEffect, useRef } from 'react';

import debug from 'debug';
import { useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { beginLandscapeRenderTask, waitForNextPaint } from 'explorviz-frontend/src/stores/landscape-render-progress';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  calculateAggregatedCommunications,
  computeBuildingCommunication,
} from 'explorviz-frontend/src/utils/city-rendering/communication-computer';
import { reconcileDistrictStatesWithTree } from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { areArraysEqual } from 'explorviz-frontend/src/utils/helpers/array-helpers';
import { CommSummary } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import {
  FlatLandscape,
  getFlatLandscapeStructureSignature,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import layoutLandscape from 'explorviz-frontend/src/utils/layout/landscape-layouter';
import { tryApplyPendingSerializedRoom } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';

function refreshBuildingCommunications(
  flatLandscapeStructure: FlatLandscape,
  aggregatedCommunication: CommSummary | undefined
) {
  const buildingCommunications = computeBuildingCommunication(flatLandscapeStructure, aggregatedCommunication);

  useModelStore.getState().setBuildingCommunications(buildingCommunications);
  calculateAggregatedCommunications(buildingCommunications);
}

export default function useLandscapeDataWatcher(landscapeData: LandscapeData | null) {
  const log = debug('app:hooks:useLandscapeWatcher');

  const { removedDistrictIds } = useVisualizationStore();

  // Variables
  const dynamicLandscapeData = landscapeData?.dynamicLandscapeData;
  const aggregatedFileCommunication = landscapeData?.aggregatedFileCommunication;
  const flatLandscapeData = landscapeData?.flatLandscapeData;

  const lastProcessedDynamicData = useRef<DynamicLandscapeData | null>(null);
  const lastProcessedFlatLandscapeSignature = useRef<string>('');
  const lastProcessedLandscapeData = useRef<LandscapeData | null>(null);
  const lastSignedFlatLandscape = useRef<FlatLandscape | null>(null);
  const lastSignature = useRef<string>('');
  const layoutGenerationRef = useRef(0);

  const getCachedStructureSignature = (flatLandscape: FlatLandscape) => {
    if (lastSignedFlatLandscape.current !== flatLandscape) {
      lastSignedFlatLandscape.current = flatLandscape;
      lastSignature.current = getFlatLandscapeStructureSignature(flatLandscape);
    }
    return lastSignature.current;
  };

  /**
   * Runtime timestamp switches usually keep the same city/district/building
   * structure and only change dynamic/communication data. Relayouting in that
   * case rebuilds BoxLayout identities, which cascades into cluster distance
   * resets and briefly unmounts semantic-zoom labels.
   */
  const handleDynamicOnlyUpdate = () => {
    log('handleDynamicOnlyUpdate');

    const landscapeDataFromStore = useRenderingServiceStore.getState()._landscapeData;
    const flatLandscapeStructure = landscapeDataFromStore?.flatLandscapeData ?? flatLandscapeData;
    const aggregatedCommunication = landscapeDataFromStore?.aggregatedFileCommunication ?? aggregatedFileCommunication;

    if (!flatLandscapeStructure) {
      return;
    }

    log('Refresh building communication only');
    refreshBuildingCommunications(flatLandscapeStructure, aggregatedCommunication);
  };

  const handleLandscapeUpdate = useCallback(async () => {
    const generation = ++layoutGenerationRef.current;
    log('handleLandscapeUpdate');
    const endRenderTask = beginLandscapeRenderTask();

    try {
      // Let the rendering indicator paint before the work below blocks the main thread.
      await waitForNextPaint();

      const landscapeDataFromStore = useRenderingServiceStore.getState()._landscapeData;
      const flatLandscapeStructure = landscapeDataFromStore?.flatLandscapeData ?? flatLandscapeData;
      const dynamicData = landscapeDataFromStore?.dynamicLandscapeData ?? dynamicLandscapeData;
      const aggregatedCommunication =
        landscapeDataFromStore?.aggregatedFileCommunication ?? aggregatedFileCommunication;

      if (!dynamicData || !flatLandscapeStructure) {
        return;
      }

      log('Layouting landscape ...');
      const boxLayoutMap = await layoutLandscape(flatLandscapeStructure, removedDistrictIds);
      if (generation !== layoutGenerationRef.current) {
        return;
      }
      log('Layouted landscape: ', boxLayoutMap);

      log('Compute building communication');
      const buildingCommunications = computeBuildingCommunication(flatLandscapeStructure, aggregatedCommunication);

      // In Remove mode the entity filter applier owns cities/districts/buildings.
      if (useEntityFilteringStore.getState().filterMode === 'Remove') {
        useModelStore.getState().setBuildingCommunications(buildingCommunications);
      } else {
        useModelStore.getState().setAllModels({
          cities: Object.values(flatLandscapeStructure.cities),
          districts: Object.values(flatLandscapeStructure.districts),
          buildings: Object.values(flatLandscapeStructure.buildings),
          buildingCommunications: buildingCommunications,
        });
      }

      calculateAggregatedCommunications(buildingCommunications);

      // The District tree may have changed (e.g. Districts removed or restored by
      // the entity filter), which can leave open Districts inside closed ones.
      reconcileDistrictStatesWithTree();

      useLayoutStore.getState().updateLayouts(boxLayoutMap, flatLandscapeStructure);

      tryApplyPendingSerializedRoom();
    } finally {
      // Released after the next paint, once the new city is drawn.
      endRenderTask();
    }
  }, [dynamicLandscapeData, aggregatedFileCommunication, flatLandscapeData, removedDistrictIds, log]);

  useEffect(() => {
    // No data means the visualization session was reset (e.g. another Snapshot of the same Landscape is
    // being opened), which cleared models and layouts: whatever comes next needs a full update, even if its
    // structure equals what was shown before. A layout still running for the old data is dropped.
    if (landscapeData === null) {
      layoutGenerationRef.current++;
      lastProcessedLandscapeData.current = null;
      lastProcessedDynamicData.current = null;
      lastProcessedFlatLandscapeSignature.current = '';
      return;
    }

    if (!dynamicLandscapeData || !flatLandscapeData) {
      return;
    }

    const currentFlatLandscapeSignature = getCachedStructureSignature(flatLandscapeData);

    const flatChanged = currentFlatLandscapeSignature !== lastProcessedFlatLandscapeSignature.current;

    const landscapeChanged = landscapeData !== lastProcessedLandscapeData.current;

    // Deep-comparing the traces is expensive, so only fall back to it when the
    // cheap checks did not already tell us that an update is due.
    const dynamicChanged =
      !landscapeChanged && !flatChanged && !areArraysEqual(dynamicLandscapeData, lastProcessedDynamicData.current);

    if (!landscapeChanged && !flatChanged && !dynamicChanged) {
      return;
    }

    lastProcessedLandscapeData.current = landscapeData;
    lastProcessedDynamicData.current = dynamicLandscapeData;
    lastProcessedFlatLandscapeSignature.current = currentFlatLandscapeSignature;

    if (flatChanged) {
      handleLandscapeUpdate();
    } else {
      handleDynamicOnlyUpdate();
    }
  }, [
    landscapeData,
    dynamicLandscapeData,
    aggregatedFileCommunication,
    flatLandscapeData,
    handleLandscapeUpdate,
    handleDynamicOnlyUpdate,
  ]);
}
