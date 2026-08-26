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
import { pruneFlatLandscapeByRemainingBuildings } from 'explorviz-frontend/src/utils/city-rendering/flat-landscape-filter';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  Building,
  FlatLandscape,
  getFlatLandscapeEntityType,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import {
  isExcludedBySearchExpressions,
  isIncludedBySearchExpressions,
} from 'explorviz-frontend/src/utils/search-expression-matcher';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';
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
    const buildingIdsToFilter = Object.values(
      baselineFlatLandscape.buildings
    ).filter((building) => {
      const language = normalizeLanguage(building.language);
      const isFilteredByLanguage =
        filterMode === 'Remove' && hiddenLanguages.has(language);
      const isFilteredByMetric = BUILDING_METRIC_NAMES.some(
        (metricName) =>
          getMetricValue(building, metricName) < (thresholds[metricName] ?? 0)
      );
      const buildingFqn = building.fqn ?? building.name;
      const isFilteredByFqn =
        !isIncludedBySearchExpressions(
          buildingFqn,
          inclusionExpressionValues
        ) ||
        isExcludedBySearchExpressions(buildingFqn, exclusionExpressionValues);
      return isFilteredByLanguage || isFilteredByMetric || isFilteredByFqn;
    });

    if (filterMode === 'Hide') {
      const idsToHide = new Set(
        buildingIdsToFilter.map((building) => building.id)
      );
      setFilterHiddenBuildingIds([...idsToHide]);
      hiddenBuildingIdsByFilterRef.current = idsToHide;
      syncLayoutStoreWithFlatLandscape(baselineFlatLandscape);

      ignoreNextLandscapeUpdateRef.current = true;
      triggerRenderingForGivenLandscapeData(
        baselineFlatLandscape,
        initialLandscapeData.current.dynamicLandscapeData,
        initialLandscapeData.current.aggregatedFileCommunication
      );
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

    useModelStore
      .getState()
      .setCities(Object.values(deepCopyFlatLandscape.cities));
    useModelStore
      .getState()
      .setDistricts(Object.values(deepCopyFlatLandscape.districts));
    useModelStore
      .getState()
      .setBuildings(Object.values(deepCopyFlatLandscape.buildings));
    syncLayoutStoreWithFlatLandscape(deepCopyFlatLandscape);

    ignoreNextLandscapeUpdateRef.current = true;
    triggerRenderingForGivenLandscapeData(
      deepCopyFlatLandscape,
      initialLandscapeData.current.dynamicLandscapeData,
      initialLandscapeData.current.aggregatedFileCommunication
    );
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
    refreshFilterBaseline(nextLandscapeData, nextFlatLandscapeData);
    applyFilters();
  };

  const resetForNewTimestamp = () => {
    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      setFilterHiddenBuildingIds([]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }
    initialLandscapeData.current = latestLandscapeDataRef.current;
    initialFlatLandscapeData.current = latestFlatLandscapeDataRef.current;
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
