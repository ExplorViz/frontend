import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import BuildingMetricFiltering, {
  BuildingMetricFilteringHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/building-metric-filtering';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  Building,
  FlatLandscape,
  Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/settings/language-settings';

interface StructureFilteringProps {
  readonly landscapeData: LandscapeData;
  readonly flatLandscapeData: FlatLandscape;
  readonly filterMode: 'Hide' | 'Remove';
}

export type StructureFilteringHandle = {
  setMinMethodCount: (value: number) => void;
  reset: () => void;
};

const StructureFiltering = forwardRef<
  StructureFilteringHandle,
  StructureFilteringProps
>(function StructureFiltering(
  { landscapeData, flatLandscapeData, filterMode }: StructureFilteringProps,
  ref
) {
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

  const getMetricValue = (building: Building, metricKey: string): number =>
    building.metrics?.[metricKey]?.current ?? 0;

  const getAvailableMetricKeys = (_landscape: FlatLandscape): string[] =>
    [...BUILDING_METRIC_NAMES];

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

  const getDefaultThresholds = (
    metricBounds: Record<string, { min: number; max: number }>
  ): Record<string, number> =>
    Object.fromEntries(
      Object.entries(metricBounds).map(([metricName, bounds]) => [
        metricName,
        bounds.min,
      ])
    );

  const [metricOptions, setMetricOptions] = useState<string[]>(
    getAvailableMetricKeys(flatLandscapeData)
  );
  const [metricBounds, setMetricBounds] = useState<
    Record<string, { min: number; max: number }>
  >(() => getMetricBounds(flatLandscapeData));
  const [selectedMetricThresholds, setSelectedMetricThresholds] = useState<
    Record<string, number>
  >(() => getDefaultThresholds(getMetricBounds(flatLandscapeData)));
  const selectedMetricThresholdsRef = useRef<Record<string, number>>(
    selectedMetricThresholds
  );

  const buildingCount = Object.keys(flatLandscapeData.buildings).length;

  const [initialBuildingCount, setInitialBuildingCount] =
    useState<number>(buildingCount);
  const [
    numRemainingBuildingsAfterFiltering,
    setNumRemainingBuildingsAfterFiltering,
  ] = useState<number>(initialBuildingCount);

  const latestLandscapeDataRef = useRef<LandscapeData>(landscapeData);
  const latestFlatLandscapeDataRef = useRef<FlatLandscape>(flatLandscapeData);
  const ignoreNextLandscapeUpdateRef = useRef<boolean>(false);
  const hiddenBuildingIdsByFilterRef = useRef<Set<string>>(new Set());
  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const initialFlatLandscapeData = useRef<FlatLandscape>(flatLandscapeData);
  const buildingMetricRef = useRef<BuildingMetricFilteringHandle>(null);

  const updateMetricThreshold = (metric: string, value: number) => {
    const nextThresholds = {
      ...selectedMetricThresholdsRef.current,
      [metric]: value,
    };
    selectedMetricThresholdsRef.current = nextThresholds;
    setSelectedMetricThresholds(nextThresholds);
    _triggerRenderingForGivenLandscapeData(nextThresholds);
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
    const availableMetricKeys = getAvailableMetricKeys(nextFlatLandscapeData);
    const nextMetricBounds = getMetricBounds(nextFlatLandscapeData);
    const defaultThresholds = getDefaultThresholds(nextMetricBounds);
    setMetricOptions(availableMetricKeys);
    setMetricBounds(nextMetricBounds);
    setSelectedMetricThresholds(defaultThresholds);
    selectedMetricThresholdsRef.current = defaultThresholds;
    const nextBuildingCount = Object.keys(
      nextFlatLandscapeData.buildings
    ).length;
    setInitialBuildingCount(nextBuildingCount);
    setNumRemainingBuildingsAfterFiltering(nextBuildingCount);
  };

  const resetState = () => {
    // reset state, since new timestamp/commit has been loaded
    resetStateForData(
      latestLandscapeDataRef.current,
      latestFlatLandscapeDataRef.current
    );
  };

  const _triggerRenderingForGivenLandscapeData = (
    thresholds: Record<string, number> = selectedMetricThresholdsRef.current
  ) => {
    const baselineFlatLandscape = initialFlatLandscapeData.current;
    const buildingIdsToFilter = Object.values(
      baselineFlatLandscape.buildings
    ).filter((building) => {
      const language = normalizeLanguage(building.language);
      const isFilteredByLanguage =
        filterMode === 'Remove' && hiddenLanguages.has(language);
      const isFilteredByMetric = metricOptions.some(
        (metricName) =>
          getMetricValue(building, metricName) < (thresholds[metricName] ?? 0)
      );
      return isFilteredByLanguage || isFilteredByMetric;
    });

    setNumRemainingBuildingsAfterFiltering(
      Object.keys(baselineFlatLandscape.buildings).length -
        buildingIdsToFilter.length
    );

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

    // Prevent the next prop update (caused by this filtered render) from
    // resetting baseline metric bounds.
    ignoreNextLandscapeUpdateRef.current = true;
    triggerRenderingForGivenLandscapeData(
      deepCopyFlatLandscape,
      initialLandscapeData.current.dynamicLandscapeData,
      initialLandscapeData.current.aggregatedFileCommunication
    );
  };

  useEffect(() => {
    if (ignoreNextLandscapeUpdateRef.current) {
      ignoreNextLandscapeUpdateRef.current = false;
      return;
    }
    latestLandscapeDataRef.current = landscapeData;
    latestFlatLandscapeDataRef.current = flatLandscapeData;
    // Recompute bounds and slider values for external landscape updates
    // (e.g., commit/timestamp selection), but not for filtered renders.
    resetStateForData(landscapeData, flatLandscapeData);
  }, [landscapeData, flatLandscapeData]);

  useEffect(() => {
    _triggerRenderingForGivenLandscapeData(selectedMetricThresholdsRef.current);
  }, [filterMode]);

  useEffect(() => {
    if (filterMode === 'Remove') {
      _triggerRenderingForGivenLandscapeData(
        selectedMetricThresholdsRef.current
      );
    }
  }, [hiddenLanguages, filterMode]);

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    return () => {
      if (hiddenBuildingIdsByFilterRef.current.size > 0) {
        showBuildings([...hiddenBuildingIdsByFilterRef.current]);
        hiddenBuildingIdsByFilterRef.current = new Set();
      }
      triggerRenderingForGivenLandscapeData(
        initialFlatLandscapeData.current,
        initialLandscapeData.current.dynamicLandscapeData,
        initialLandscapeData.current.aggregatedFileCommunication
      );
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setMinMethodCount: (value: number) => {
      buildingMetricRef.current?.setFunctionCountValue(value);
    },
    reset: () => {
      buildingMetricRef.current?.reset();
      resetState();
    },
  }));

  return (
    <>
      <h6 className="mb-3 mt-3">
        <strong>
          Buildings (# shown:
          {numRemainingBuildingsAfterFiltering}/{initialBuildingCount})
        </strong>
      </h6>

      <BuildingMetricFiltering
        ref={buildingMetricRef}
        metricBounds={metricBounds}
        selectedMetricThresholds={selectedMetricThresholds}
        updateMetricThreshold={updateMetricThreshold}
        remainingEntityCountAfterFiltering={numRemainingBuildingsAfterFiltering}
        initialEntityCount={initialBuildingCount}
      />
    </>
  );
});

export default StructureFiltering;
