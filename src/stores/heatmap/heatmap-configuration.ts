import { create } from 'zustand';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import {
  ApplicationMetrics,
  Metric,
} from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import revertKey from 'explorviz-frontend/src/utils/heatmap/heatmap-generator';

import { getColorGradient as getSimpleDefaultGradient } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';

export type HeatmapMode =
  | 'snapshotHeatmap'
  | 'aggregatedHeatmap'
  | 'windowedHeatmap';

interface HeatmapConfigurationState {
  heatmapActive: boolean; // tracked
  heatmapShared: boolean; // tracked
  currentApplication?: ApplicationObject3D | undefined | null; //tracked
  largestValue: number;
  legendActive: boolean;
  windowSize: number;
  selectedMode: HeatmapMode; //tracked
  selectedMetricName: string; //tracked
  useHelperLines: boolean;
  opacityValue: number;
  heatmapRadius: number;
  blurRadius: number;
  showLegendValues: boolean;
  simpleHeatGradient: any; // TODO maybe turn into interface
  toggleShared: () => void;
  setActive: (isActive: boolean) => void;
  deactivate: () => void;
  activate: () => void;
  getLatestClazzMetricScores: () => Metric[];
  setCurrentApplication: (
    applicationObject3D: ApplicationObject3D | null | undefined
  ) => void;
  setActiveApplication: (applicationObject3D: ApplicationObject3D) => void;
  updateActiveApplication: (applicationObject3D: ApplicationObject3D) => void;
  getApplicationMetricsForEncompassingApplication: () =>
    | ApplicationMetrics
    | undefined;
  getSelectedMetric: () => Metric | undefined;
  setSelectedMetricName: (metricName: string) => void;
  updateMetric: (metric: Metric) => void;
  switchMode: () => void;
  switchMetric: () => void;
  toggleLegend: () => void;
  getSimpleHeatGradient: () => any;
  resetSimpleHeatGradient: () => void;
  cleanup: () => void;
  setSelectedMode: (mode: HeatmapMode) => void;
  setHeatmapRadius: (radius: number) => void;
  setBlurRadius: (radius: number) => void;
  setShowLegendValues: (show: boolean) => void;
  setUseHelperLines: (value: boolean) => void;
  setSimpleHeatGradient: (value: any) => void;
}

export const useHeatmapConfigurationStore = create<HeatmapConfigurationState>(
  (set, get) => ({
    heatmapActive: false,
    heatmapShared: false,
    currentApplication: undefined,
    legendActive: true,
    // TODO this is never assigned another value, but used in calculation. What is it supposed to do?
    largestValue: 0,
    windowSize: 9,
    selectedMode: 'snapshotHeatmap',
    selectedMetricName: 'Instance Count',
    useHelperLines: true,
    opacityValue: 0.03,
    heatmapRadius: 2,
    blurRadius: 0,
    showLegendValues: true,
    simpleHeatGradient: getSimpleDefaultGradient(),

    setSelectedMode: (mode: HeatmapMode) => {
      set({ selectedMode: mode });
    },

    setHeatmapRadius: (radius: number) => {
      set({ heatmapRadius: radius });
    },

    setBlurRadius: (radius: number) => {
      set({ blurRadius: radius });
    },

    setShowLegendValues: (show: boolean) => {
      set({ showLegendValues: show });
    },

    setUseHelperLines: (value: boolean) => {
      set({ useHelperLines: value });
    },

    setSimpleHeatGradient: (value: any) => {
      set({ simpleHeatGradient: value });
    },

    toggleShared: () => {
      set({ heatmapShared: !get().heatmapShared });
    },

    setActive: (isActive: boolean) => {
      set({ heatmapActive: isActive });
    },

    deactivate: () => {
      set({ heatmapActive: false });
      set({ currentApplication: null });
    },

    activate: () => {
      set({ heatmapActive: true });
    },

    getLatestClazzMetricScores: () => {
      return (
        get().getApplicationMetricsForEncompassingApplication()
          ?.latestClazzMetricScores || []
      );
    },

    setCurrentApplication: (currentApplication) =>
      set({ currentApplication: currentApplication }),

    setActiveApplication: (applicationObject3D: ApplicationObject3D) => {
      set({ currentApplication: applicationObject3D });
      get().updateActiveApplication(applicationObject3D);
    },

    updateActiveApplication: (applicationObject3D: ApplicationObject3D) => {
      if (
        !get().currentApplication ||
        get().currentApplication === applicationObject3D
      ) {
        set({ currentApplication: applicationObject3D });
      }
    },

    getApplicationMetricsForEncompassingApplication: () => {
      if (!get().currentApplication) {
        return undefined;
      }
      const applicationData = useApplicationRepositoryStore
        .getState()
        .getByAppId(get().currentApplication!.getModelId());

      return applicationData?.applicationMetrics;
    },

    getSelectedMetric: () => {
      if (!get().heatmapActive || !get().currentApplication) {
        return undefined;
      }
      let chosenMetric = null;
      const applicationMetricsForCurrentApplication =
        get().getApplicationMetricsForEncompassingApplication();
      const latestClazzMetricScores =
        get().getApplicationMetricsForEncompassingApplication()
          ?.latestClazzMetricScores;
      if (
        !applicationMetricsForCurrentApplication ||
        !latestClazzMetricScores
      ) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('No heatmap found');
        return undefined;
      }

      switch (get().selectedMode) {
        case 'snapshotHeatmap':
          if (applicationMetricsForCurrentApplication.latestClazzMetricScores) {
            chosenMetric =
              applicationMetricsForCurrentApplication.latestClazzMetricScores.find(
                (metric) => metric.name === get().selectedMetricName
              );
            if (chosenMetric) {
              return chosenMetric;
            }
          }
          break;
        case 'aggregatedHeatmap':
          if (applicationMetricsForCurrentApplication.aggregatedMetricScores) {
            chosenMetric =
              applicationMetricsForCurrentApplication.aggregatedMetricScores.get(
                get().selectedMetricName
              );
            if (chosenMetric) {
              return chosenMetric;
            }
          }
          break;
        case 'windowedHeatmap':
          if (applicationMetricsForCurrentApplication.differenceMetricScores) {
            chosenMetric =
              applicationMetricsForCurrentApplication.differenceMetricScores.get(
                get().selectedMetricName
              );
            if (chosenMetric && chosenMetric[chosenMetric.length - 1]) {
              return chosenMetric[chosenMetric.length - 1];
            }
          }
          break;
        default:
          break;
      }
      return latestClazzMetricScores.at(0);
    },

    setSelectedMetricName: (metricName) =>
      set({ selectedMetricName: metricName }),

    updateMetric: (metric: Metric) => {
      const metricName = metric.name;
      set({ selectedMetricName: metricName });
    },

    switchMode: () => {
      switch (get().selectedMode) {
        case 'snapshotHeatmap':
          set({ selectedMode: 'aggregatedHeatmap' });
          break;
        case 'aggregatedHeatmap':
          set({ selectedMode: 'windowedHeatmap' });
          break;
        case 'windowedHeatmap':
          set({ selectedMode: 'snapshotHeatmap' });
          break;
        default:
          set({ selectedMode: 'snapshotHeatmap' });
          break;
      }
    },

    switchMetric: () => {
      const numOfMetrics = get().getLatestClazzMetricScores().length;
      if (numOfMetrics > 0) {
        const index = get()
          .getLatestClazzMetricScores()
          .findIndex((metric) => metric.name === get().selectedMetricName);
        set({
          selectedMetricName:
            get().getLatestClazzMetricScores()[(index + 1) % numOfMetrics].name,
        });
      }
    },

    toggleLegend: () => {
      set({ legendActive: !get().legendActive });
    },

    /**
     * Return a gradient where the '_' character in the keys is replaced with '.'.
     */
    getSimpleHeatGradient: () => {
      return revertKey(get().simpleHeatGradient);
    },

    /**
     * Reset the gradient to default values.
     */
    resetSimpleHeatGradient: () => {
      set({ simpleHeatGradient: getSimpleDefaultGradient() });
    },

    /**
     * Reset all class attribute values to null;
     */
    cleanup: () => {
      set({ currentApplication: null });
      set({ heatmapActive: false });
      set({ largestValue: 0 });
    },
  })
);
