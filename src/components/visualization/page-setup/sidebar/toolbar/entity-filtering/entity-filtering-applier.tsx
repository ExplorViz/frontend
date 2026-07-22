import { useEffect, useRef } from 'react';

import {
  getLanguageCountsFromBuildings,
  useEntityFilteringStore,
} from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  Building,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
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
  const hideBuildings = useVisualizationStore(
    (state) => state.actions.hideBuildings
  );
  const showBuildings = useVisualizationStore(
    (state) => state.actions.showBuildings
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
      if (hiddenBuildingIdsByFilterRef.current.size > 0) {
        showBuildings([...hiddenBuildingIdsByFilterRef.current]);
      }
      const idsToHide = new Set(
        buildingIdsToFilter.map((building) => building.id)
      );
      hideBuildings([...idsToHide]);
      hiddenBuildingIdsByFilterRef.current = idsToHide;

      ignoreNextLandscapeUpdateRef.current = true;
      triggerRenderingForGivenLandscapeData(
        baselineFlatLandscape,
        initialLandscapeData.current.dynamicLandscapeData,
        initialLandscapeData.current.aggregatedFileCommunication
      );
      return;
    }

    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      showBuildings([...hiddenBuildingIdsByFilterRef.current]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }

    const deepCopyFlatLandscape = structuredClone(baselineFlatLandscape);
    for (const building of buildingIdsToFilter) {
      delete deepCopyFlatLandscape.buildings[building.id];
    }

    const remainingBuildingIds = new Set(
      Object.keys(deepCopyFlatLandscape.buildings)
    );

    for (const district of Object.values(deepCopyFlatLandscape.districts)) {
      district.buildingIds = district.buildingIds.filter((id) =>
        remainingBuildingIds.has(id)
      );
    }

    for (const city of Object.values(deepCopyFlatLandscape.cities)) {
      city.buildingIds = city.buildingIds.filter((id) =>
        remainingBuildingIds.has(id)
      );
      city.allContainedBuildingIds = city.allContainedBuildingIds.filter((id) =>
        remainingBuildingIds.has(id)
      );
    }

    ignoreNextLandscapeUpdateRef.current = true;
    triggerRenderingForGivenLandscapeData(
      deepCopyFlatLandscape,
      initialLandscapeData.current.dynamicLandscapeData,
      initialLandscapeData.current.aggregatedFileCommunication
    );
  };

  const updateBaseline = (nextFlatLandscapeData: FlatLandscape) => {
    setBaselineLanguageStats(
      getLanguageCountsFromBuildings(
        Object.values(nextFlatLandscapeData.buildings)
      )
    );
  };

  const resetStateForData = (
    nextLandscapeData: LandscapeData,
    nextFlatLandscapeData: FlatLandscape
  ) => {
    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      showBuildings([...hiddenBuildingIdsByFilterRef.current]);
      hiddenBuildingIdsByFilterRef.current = new Set();
    }
    initialLandscapeData.current = nextLandscapeData;
    initialFlatLandscapeData.current = nextFlatLandscapeData;
    updateBaseline(nextFlatLandscapeData);
    applyFilters();
  };

  const resetForNewTimestamp = () => {
    if (hiddenBuildingIdsByFilterRef.current.size > 0) {
      showBuildings([...hiddenBuildingIdsByFilterRef.current]);
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
