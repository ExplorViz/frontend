import { useEffect, useRef } from 'react';

import {
  getLanguageCountsFromBuildings,
  getLanguageFileExtensionStatsFromBuildings,
  useEntityFilteringStore,
} from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  collectFilteredBuildings,
  compileBuildingFilter,
} from 'explorviz-frontend/src/utils/city-rendering/building-filter';
import { pruneFlatLandscapeByRemainingBuildings } from 'explorviz-frontend/src/utils/city-rendering/flat-landscape-filter';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  Building,
  FlatLandscape,
  getFlatLandscapeEntityType,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useShallow } from 'zustand/react/shallow';

interface EntityFilteringApplierProps {
  readonly landscapeData: LandscapeData;
}

const getMetricValue = (building: Building, metricKey: string): number =>
  building.metrics?.[metricKey]?.current ?? 0;

const getDefaultThresholds = (
  metricBounds: Record<string, { min: number; max: number }>
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(metricBounds).map(([metricName, bounds]) => [
      metricName,
      bounds.min,
    ])
  );

const getMetricBounds = (
  landscape: FlatLandscape
): Record<string, { min: number; max: number }> => {
  const buildings = Object.values(landscape.buildings);
  const metricBounds: Record<string, { min: number; max: number }> = {};

  BUILDING_METRIC_NAMES.forEach((metricName) => {
    if (buildings.length === 0) {
      metricBounds[metricName] = { min: 0, max: 0 };
      return;
    }

    const max = buildings.reduce((acc, building) => {
      const val = getMetricValue(building, metricName);
      return Math.max(acc, val);
    }, Number.NEGATIVE_INFINITY);

    metricBounds[metricName] = {
      min: 0,
      max: Number.isFinite(max) ? max : 0,
    };
  });

  return metricBounds;
};

function syncLayoutStoreWithFlatLandscape(flatLandscape: FlatLandscape): void {
  const layoutState = useLayoutStore.getState();
  const prunedLayoutMap = new Map<string, BoxLayout>();

  layoutState.fullLayoutMap.forEach((layout, entityId) => {
    if (entityId === 'landscape') {
      prunedLayoutMap.set(entityId, layout);
      return;
    }

    const entityType = getFlatLandscapeEntityType(entityId, flatLandscape);
    if (entityType === 'city' && flatLandscape.cities[entityId]) {
      prunedLayoutMap.set(entityId, layout);
    } else if (entityType === 'district' && flatLandscape.districts[entityId]) {
      prunedLayoutMap.set(entityId, layout);
    } else if (entityType === 'building' && flatLandscape.buildings[entityId]) {
      prunedLayoutMap.set(entityId, layout);
    }
  });

  layoutState.updateLayouts(prunedLayoutMap, flatLandscape);
}

function getBuildingCount(flatLandscape: FlatLandscape): number {
  return Object.keys(flatLandscape.buildings).length;
}

function shouldRefreshFilterBaseline(
  currentBaseline: FlatLandscape,
  candidateFlatLandscape: FlatLandscape
): boolean {
  return (
    getBuildingCount(currentBaseline) === 0 ||
    getBuildingCount(candidateFlatLandscape) >=
      getBuildingCount(currentBaseline)
  );
}

function syncModelStoreToFlatLandscape(flatLandscape: FlatLandscape): void {
  useModelStore.getState().setCities(Object.values(flatLandscape.cities));
  useModelStore.getState().setDistricts(Object.values(flatLandscape.districts));
  useModelStore.getState().setBuildings(Object.values(flatLandscape.buildings));
  syncLayoutStoreWithFlatLandscape(flatLandscape);
}

export default function EntityFilteringApplier({
  landscapeData,
}: EntityFilteringApplierProps) {
  const { flatLandscapeData } = landscapeData;
  const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );
  const hiddenLanguages = useVisualizationStore(
    (state) => state.hiddenLanguages
  );
  const setFilterHiddenBuildingIds = useVisualizationStore(
    (state) => state.actions.setFilterHiddenBuildingIds
  );

  const {
    filterMode,
    inclusionExpressions,
    exclusionExpressions,
    metricThresholds,
  } = useEntityFilteringStore(
    useShallow((state) => ({
      filterMode: state.filterMode,
      inclusionExpressions: state.inclusionExpressions,
      exclusionExpressions: state.exclusionExpressions,
      metricThresholds: state.metricThresholds,
    }))
  );
  const setMetricThresholds = useEntityFilteringStore(
    (state) => state.actions.setMetricThresholds
  );
  const setBaselineLanguageStats = useEntityFilteringStore(
    (state) => state.actions.setBaselineLanguageStats
  );
  const setBaselineLanguageFileExtensionStats = useEntityFilteringStore(
    (state) => state.actions.setBaselineLanguageFileExtensionStats
  );
  const setBaselineFlatLandscape = useEntityFilteringStore(
    (state) => state.actions.setBaselineFlatLandscape
  );

  const latestLandscapeDataRef = useRef<LandscapeData>(landscapeData);
  const latestFlatLandscapeDataRef = useRef<FlatLandscape>(flatLandscapeData);
  const ignoreNextLandscapeUpdateRef = useRef<boolean>(false);
  const hiddenBuildingIdsByFilterRef = useRef<Set<string>>(new Set());
  const removeModePrunedRenderedRef = useRef<boolean>(false);
  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const initialFlatLandscapeData = useRef<FlatLandscape>(flatLandscapeData);

  const inclusionExpressionValues = inclusionExpressions.map(
    (option) => option.value
  );
  const exclusionExpressionValues = exclusionExpressions.map(
    (option) => option.value
  );

  const applyFilters = (
    thresholds: Record<string, number> = metricThresholds
  ) => {
    const baselineFlatLandscape = initialFlatLandscapeData.current;
    const compiledFilter = compileBuildingFilter({
      filterMode,
      hiddenLanguages,
      inclusionExpressions: inclusionExpressionValues,
      exclusionExpressions: exclusionExpressionValues,
      metricThresholds: thresholds,
    });
    const buildingIdsToFilter = collectFilteredBuildings(
      baselineFlatLandscape.buildings,
      compiledFilter
    );
    const renderedFlatLandscape =
      useRenderingServiceStore.getState()._landscapeData?.flatLandscapeData;

    const restoreBaselineLandscape = () => {
      syncLayoutStoreWithFlatLandscape(baselineFlatLandscape);
      ignoreNextLandscapeUpdateRef.current = true;
      triggerRenderingForGivenLandscapeData(
        baselineFlatLandscape,
        initialLandscapeData.current.dynamicLandscapeData,
        initialLandscapeData.current.aggregatedFileCommunication
      );
      removeModePrunedRenderedRef.current = false;
    };

    if (!compiledFilter.isActive) {
      if (hiddenBuildingIdsByFilterRef.current.size > 0) {
        setFilterHiddenBuildingIds([]);
        hiddenBuildingIdsByFilterRef.current = new Set();
      }

      if (filterMode === 'Hide') {
        // With no entity filters active, leave externally filtered landscapes
        // (e.g. commit-chart building comparison categories) untouched.
        if (
          removeModePrunedRenderedRef.current &&
          renderedFlatLandscape !== baselineFlatLandscape
        ) {
          restoreBaselineLandscape();
        }
        return;
      }

      // Remove mode: the landscape watcher only updates communications here,
      // so we must keep the model store in sync ourselves.
      if (
        removeModePrunedRenderedRef.current &&
        renderedFlatLandscape !== baselineFlatLandscape
      ) {
        syncModelStoreToFlatLandscape(baselineFlatLandscape);

        ignoreNextLandscapeUpdateRef.current = true;
        triggerRenderingForGivenLandscapeData(
          baselineFlatLandscape,
          initialLandscapeData.current.dynamicLandscapeData,
          initialLandscapeData.current.aggregatedFileCommunication
        );
        removeModePrunedRenderedRef.current = false;
        return;
      }

      syncModelStoreToFlatLandscape(
        renderedFlatLandscape ?? baselineFlatLandscape
      );
      return;
    }

    if (filterMode === 'Hide') {
      const idsToHide = new Set(
        buildingIdsToFilter.map((building) => building.id)
      );
      setFilterHiddenBuildingIds([...idsToHide]);
      hiddenBuildingIdsByFilterRef.current = idsToHide;

      if (renderedFlatLandscape === baselineFlatLandscape) {
        return;
      }

      // Only restore the full baseline when a previous Remove-mode pass pruned
      // the rendered landscape. Otherwise keep external subset filters intact.
      if (!removeModePrunedRenderedRef.current) {
        return;
      }

      restoreBaselineLandscape();
      return;
    }

    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      setFilterHiddenBuildingIds([]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }

    const deepCopyFlatLandscape = structuredClone(baselineFlatLandscape);
    for (const building of buildingIdsToFilter) {
      delete deepCopyFlatLandscape.buildings[building.id];
    }

    pruneFlatLandscapeByRemainingBuildings(deepCopyFlatLandscape);

    syncModelStoreToFlatLandscape(deepCopyFlatLandscape);

    ignoreNextLandscapeUpdateRef.current = true;
    triggerRenderingForGivenLandscapeData(
      deepCopyFlatLandscape,
      initialLandscapeData.current.dynamicLandscapeData,
      initialLandscapeData.current.aggregatedFileCommunication
    );
    removeModePrunedRenderedRef.current = true;
  };

  const updateBaseline = (baselineFlatLandscape: FlatLandscape) => {
    const buildings = Object.values(baselineFlatLandscape.buildings);
    setBaselineFlatLandscape(baselineFlatLandscape);
    setBaselineLanguageStats(getLanguageCountsFromBuildings(buildings));
    setBaselineLanguageFileExtensionStats(
      getLanguageFileExtensionStatsFromBuildings(buildings)
    );
  };

  const refreshFilterBaseline = (
    nextLandscapeData: LandscapeData,
    nextFlatLandscapeData: FlatLandscape
  ) => {
    if (
      shouldRefreshFilterBaseline(
        initialFlatLandscapeData.current,
        nextFlatLandscapeData
      )
    ) {
      initialLandscapeData.current = nextLandscapeData;
      initialFlatLandscapeData.current = nextFlatLandscapeData;
      updateBaseline(nextFlatLandscapeData);
    }
  };

  const resetStateForData = (
    nextLandscapeData: LandscapeData,
    nextFlatLandscapeData: FlatLandscape
  ) => {
    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      setFilterHiddenBuildingIds([]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }
    latestLandscapeDataRef.current = nextLandscapeData;
    latestFlatLandscapeDataRef.current = nextFlatLandscapeData;

    const baselineRefreshed = shouldRefreshFilterBaseline(
      initialFlatLandscapeData.current,
      nextFlatLandscapeData
    );
    refreshFilterBaseline(nextLandscapeData, nextFlatLandscapeData);

    // Only re-apply entity filters when the baseline grew (e.g. new commits
    // selected). External subset updates — such as the commit-chart "Filter
    // Buildings" comparison categories — must not be overwritten by restoring
    // the full baseline landscape.
    if (baselineRefreshed) {
      removeModePrunedRenderedRef.current = false;
      applyFilters();
    } else if (filterMode === 'Remove') {
      // The landscape watcher skips model updates in Remove mode, so sync when
      // an external filter (e.g. commit-chart building comparison) shrinks the
      // rendered landscape without refreshing the entity-filter baseline.
      syncModelStoreToFlatLandscape(nextFlatLandscapeData);
    }
  };

  const resetForNewTimestamp = () => {
    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      setFilterHiddenBuildingIds([]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }
    initialLandscapeData.current = latestLandscapeDataRef.current;
    initialFlatLandscapeData.current = latestFlatLandscapeDataRef.current;
    removeModePrunedRenderedRef.current = false;
    updateBaseline(latestFlatLandscapeDataRef.current);
    const defaultThresholds = getDefaultThresholds(
      getMetricBounds(latestFlatLandscapeDataRef.current)
    );
    setMetricThresholds(defaultThresholds);
    applyFilters(defaultThresholds);
  };

  useEffect(() => {
    refreshFilterBaseline(landscapeData, flatLandscapeData);
    // Seed the filter baseline before filter/landscape effects run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ignoreNextLandscapeUpdateRef.current) {
      ignoreNextLandscapeUpdateRef.current = false;
      return;
    }
    latestLandscapeDataRef.current = landscapeData;
    latestFlatLandscapeDataRef.current = flatLandscapeData;
    resetStateForData(landscapeData, flatLandscapeData);
  }, [landscapeData, flatLandscapeData]);

  useEffect(() => {
    applyFilters();
  }, [
    filterMode,
    hiddenLanguages,
    inclusionExpressions,
    exclusionExpressions,
    metricThresholds,
  ]);

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetForNewTimestamp);
    return () => {
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, resetForNewTimestamp);
    };
  }, []);

  return null;
}
