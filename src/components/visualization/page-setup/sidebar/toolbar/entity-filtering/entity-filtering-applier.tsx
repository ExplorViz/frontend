import { useEffect, useRef } from 'react';

import {
  getLanguageCountsFromBuildings,
  getLanguageFileExtensionStatsFromBuildings,
  MetricRange,
  useEntityFilteringStore,
} from 'explorviz-frontend/src/stores/entity-filtering-store';
import { beginLandscapeRenderTask, waitForNextPaint } from 'explorviz-frontend/src/stores/landscape-render-progress';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  collectFilteredBuildings,
  compileBuildingFilter,
  getMetricFilterBounds,
} from 'explorviz-frontend/src/utils/city-rendering/building-filter';
import { markFilteredFrom } from 'explorviz-frontend/src/utils/city-rendering/filtered-landscapes';
import {
  collapseDistrictsWithoutBuildings,
  pruneFlatLandscapeByRemainingBuildings,
} from 'explorviz-frontend/src/utils/city-rendering/flat-landscape-filter';
import {
  FlatLandscape,
  getFlatLandscapeEntityType,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { useShallow } from 'zustand/react/shallow';

interface EntityFilteringApplierProps {
  readonly landscapeData: LandscapeData;
}

const getDefaultMetricRanges = (
  metricBounds: Record<string, { min: number; max: number }>
): Record<string, MetricRange> =>
  Object.fromEntries(
    Object.entries(metricBounds).map(([metricName, bounds]) => [
      metricName,
      { min: bounds.min, max: Number.POSITIVE_INFINITY },
    ])
  );

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

function shouldRefreshFilterBaseline(currentBaseline: FlatLandscape, candidateFlatLandscape: FlatLandscape): boolean {
  return (
    getBuildingCount(currentBaseline) === 0 ||
    getBuildingCount(candidateFlatLandscape) >= getBuildingCount(currentBaseline)
  );
}

function syncModelStoreToFlatLandscape(flatLandscape: FlatLandscape): void {
  useModelStore.getState().setCities(Object.values(flatLandscape.cities));
  useModelStore.getState().setDistricts(Object.values(flatLandscape.districts));
  useModelStore.getState().setBuildings(Object.values(flatLandscape.buildings));
  syncLayoutStoreWithFlatLandscape(flatLandscape);
}

export default function EntityFilteringApplier({ landscapeData }: EntityFilteringApplierProps) {
  const { flatLandscapeData } = landscapeData;
  const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );
  const hiddenModelTypes = useVisualizationStore((state) => state.hiddenModelTypes);
  const hiddenLanguages = useVisualizationStore((state) => state.hiddenLanguages);
  const setFilterHiddenBuildingIds = useVisualizationStore((state) => state.actions.setFilterHiddenBuildingIds);
  const commitToSelectedTimestamp = useTimestampStore((state) => state.commitToSelectedTimestamps);

  const { filterMode, inclusionExpressions, exclusionExpressions, metricRanges, hideEmptyDistricts } =
    useEntityFilteringStore(
      useShallow((state) => ({
        filterMode: state.filterMode,
        inclusionExpressions: state.inclusionExpressions,
        exclusionExpressions: state.exclusionExpressions,
        metricRanges: state.metricRanges,
        hideEmptyDistricts: state.hideEmptyDistricts,
      }))
    );
  const setMetricRanges = useEntityFilteringStore((state) => state.actions.setMetricRanges);
  const setBaselineLanguageStats = useEntityFilteringStore((state) => state.actions.setBaselineLanguageStats);
  const setBaselineLanguageFileExtensionStats = useEntityFilteringStore(
    (state) => state.actions.setBaselineLanguageFileExtensionStats
  );
  const setBaselineFlatLandscape = useEntityFilteringStore((state) => state.actions.setBaselineFlatLandscape);

  const latestLandscapeDataRef = useRef<LandscapeData>(landscapeData);
  const latestFlatLandscapeDataRef = useRef<FlatLandscape>(flatLandscapeData);
  const ignoreNextLandscapeUpdateRef = useRef<boolean>(false);
  const hiddenBuildingIdsByFilterRef = useRef<Set<string>>(new Set());
  const removeModePrunedRenderedRef = useRef<boolean>(false);
  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const initialFlatLandscapeData = useRef<FlatLandscape>(flatLandscapeData);

  const inclusionExpressionValues = inclusionExpressions.map((option) => option.value);
  const exclusionExpressionValues = exclusionExpressions.map((option) => option.value);

  const applyFilters = (ranges: Record<string, MetricRange> = metricRanges) => {
    const baselineFlatLandscape = initialFlatLandscapeData.current;
    const compiledFilter = compileBuildingFilter({
      filterMode,
      hiddenModelTypes,
      hiddenLanguages,
      inclusionExpressions: inclusionExpressionValues,
      exclusionExpressions: exclusionExpressionValues,
      metricRanges: ranges,
    });
    const buildingIdsToFilter = collectFilteredBuildings(baselineFlatLandscape.buildings, compiledFilter);
    const renderedFlatLandscape = useRenderingServiceStore.getState()._landscapeData?.flatLandscapeData;

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

    // In Hide mode, districts without buildings are hidden by the visibility
    // checks; in Remove mode they are removed from the landscape here.
    const removesDistrictsWithoutBuildings = filterMode === 'Remove' && hideEmptyDistricts;

    if (!compiledFilter.isActive && !removesDistrictsWithoutBuildings) {
      if (hiddenBuildingIdsByFilterRef.current.size > 0) {
        setFilterHiddenBuildingIds([]);
        hiddenBuildingIdsByFilterRef.current = new Set();
      }

      if (filterMode === 'Hide') {
        // With no entity filters active, leave externally filtered landscapes
        // (e.g. commit-chart building comparison categories) untouched.
        if (removeModePrunedRenderedRef.current && renderedFlatLandscape !== baselineFlatLandscape) {
          restoreBaselineLandscape();
        }
        return;
      }

      // Remove mode: the landscape watcher only updates communications here,
      // so we must keep the model store in sync ourselves.
      if (removeModePrunedRenderedRef.current && renderedFlatLandscape !== baselineFlatLandscape) {
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

      syncModelStoreToFlatLandscape(renderedFlatLandscape ?? baselineFlatLandscape);
      return;
    }

    if (filterMode === 'Hide') {
      const idsToHide = new Set(buildingIdsToFilter.map((building) => building.id));
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
    if (removesDistrictsWithoutBuildings) {
      collapseDistrictsWithoutBuildings(deepCopyFlatLandscape);
    }
    markFilteredFrom(deepCopyFlatLandscape, baselineFlatLandscape);

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
    setBaselineLanguageFileExtensionStats(getLanguageFileExtensionStatsFromBuildings(buildings));
  };

  const refreshFilterBaseline = (nextLandscapeData: LandscapeData, nextFlatLandscapeData: FlatLandscape) => {
    if (shouldRefreshFilterBaseline(initialFlatLandscapeData.current, nextFlatLandscapeData)) {
      initialLandscapeData.current = nextLandscapeData;
      initialFlatLandscapeData.current = nextFlatLandscapeData;
      updateBaseline(nextFlatLandscapeData);
    }
  };

  const resetStateForData = (nextLandscapeData: LandscapeData, nextFlatLandscapeData: FlatLandscape) => {
    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      setFilterHiddenBuildingIds([]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }
    latestLandscapeDataRef.current = nextLandscapeData;
    latestFlatLandscapeDataRef.current = nextFlatLandscapeData;

    const baselineRefreshed = shouldRefreshFilterBaseline(initialFlatLandscapeData.current, nextFlatLandscapeData);
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

  useEffect(() => {
    refreshFilterBaseline(landscapeData, flatLandscapeData);
    // Seed the filter baseline before filter/landscape effects run.
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
    // Filtering can rebuild the whole landscape synchronously. Show the
    // rendering indicator and let it paint first, so its animation keeps
    // running while the main thread is busy.
    const endRenderTask = beginLandscapeRenderTask();
    let superseded = false;
    waitForNextPaint()
      .then(() => {
        if (!superseded) {
          applyFilters();
        }
      })
      // Released after the next paint, by which time the landscape watcher holds
      // its own task for laying out the filtered landscape.
      .finally(endRenderTask);

    return () => {
      superseded = true;
    };
  }, [
    filterMode,
    hiddenModelTypes,
    hiddenLanguages,
    inclusionExpressions,
    exclusionExpressions,
    metricRanges,
    hideEmptyDistricts,
  ]);

  useEffect(
    function resetForNewTimestamp() {
      if (hiddenBuildingIdsByFilterRef.current.size > 0) {
        setFilterHiddenBuildingIds([]);
        hiddenBuildingIdsByFilterRef.current = new Set();
      }
      initialLandscapeData.current = latestLandscapeDataRef.current;
      initialFlatLandscapeData.current = latestFlatLandscapeDataRef.current;
      removeModePrunedRenderedRef.current = false;
      updateBaseline(latestFlatLandscapeDataRef.current);
      const defaultRanges = getDefaultMetricRanges(getMetricFilterBounds(latestFlatLandscapeDataRef.current.buildings));
      setMetricRanges(defaultRanges);
      applyFilters(defaultRanges);
    },
    [commitToSelectedTimestamp]
  );

  return null;
}
