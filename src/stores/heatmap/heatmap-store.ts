import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getMaxNumberOfMethodsPerClass } from 'explorviz-frontend/src/utils/heatmap/heatmap-helper';
import { create } from 'zustand';

export enum SelectedClassHeatmapMetric {
  None = 'None',
  Methods = 'Method Count',
  LoC = 'Lines of Code',
  DynamicMethods = 'Dynamic Method Quota',
  StaticMethods = 'Static Method Quota',
}

export enum ClassMetricIds {
  None = 'None',
  Methods = 'Method Count',
  LoC = 'Lines of Code',
  DynamicMethods = 'Dynamic Method Quota',
  StaticMethods = 'Static Method Quota',
}

const NO_SELECTED_METRIC: ClassMetric = {
  name: ClassMetricIds.None,
  description: 'No metric selected',
  min: 0,
  max: 0,
};

export type ClassMetric = {
  name: string;
  description: string;
  min: number;
  max: number;
};

interface HeatmapConfigurationState {
  heatmapShared: boolean; // tracked
  legendActive: boolean;
  selectedClassMetric: ClassMetric; //tracked
  opacityValue: number;
  showLegendValues: boolean;
  toggleShared: () => void;
  isActive: () => boolean;
  getSelectedClassMetric: () => ClassMetric | undefined;
  setSelectedClassMetric: (metricName: ClassMetricIds) => void;
  toggleLegend: () => void;
  cleanup: () => void;
  setShowLegendValues: (show: boolean) => void;
}
export const useHeatmapStore = create<HeatmapConfigurationState>(
  (set, get) => ({
    heatmapActive: true,
    heatmapShared: false,
    legendActive: true,
    selectedClassMetric: {
      name: ClassMetricIds.None,
      description: 'No metric selected',
      min: 0,
      max: 0,
    },
    opacityValue: 0.03,
    showLegendValues: true,

    setShowLegendValues: (show: boolean) => {
      set({ showLegendValues: show });
    },

    toggleShared: () => {
      set({ heatmapShared: !get().heatmapShared });
    },

    isActive: () => {
      return (
        useUserSettingsStore.getState().visualizationSettings.heatmapEnabled
          .value && get().selectedClassMetric.name !== ClassMetricIds.None
      );
    },

    getSelectedClassMetric: () => {
      return get().selectedClassMetric;
    },

    setSelectedClassMetric: (metricName: ClassMetricIds) => {
      switch (metricName) {
        case ClassMetricIds.Methods:
          set({
            selectedClassMetric: {
              name: ClassMetricIds.Methods,
              description: 'Number of methods in the class',
              min: 0,
              max: getMaxNumberOfMethodsPerClass(),
            },
          });
          break;

        case ClassMetricIds.LoC:
          set({
            selectedClassMetric: {
              name: ClassMetricIds.LoC,
              description: 'Lines of code in the class',
              min: 0,
              max: 5000, // ToDo: Get max value
            },
          });
          break;

        case ClassMetricIds.DynamicMethods:
          set({
            selectedClassMetric: {
              name: ClassMetricIds.DynamicMethods,
              description: 'Dynamic method quota of the class',
              min: 0,
              max: 1, // Percentage, so max is 1
            },
          });
          break;

        case ClassMetricIds.StaticMethods:
          set({
            selectedClassMetric: {
              name: ClassMetricIds.StaticMethods,
              description: 'Static method quota of the class',
              min: 0,
              max: 1, // Percentage, so max is 1
            },
          });
          break;

        default:
          set({
            selectedClassMetric: NO_SELECTED_METRIC,
          });
          break;
      }
    },

    toggleLegend: () => {
      set({ legendActive: !get().legendActive });
    },

    /**
     * Reset all class attribute values to null;
     */
    cleanup: () => {
      set({
        selectedClassMetric: NO_SELECTED_METRIC,
        legendActive: true,
        heatmapShared: false,
      });
    },
  })
);
