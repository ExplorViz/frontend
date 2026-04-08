import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { create } from 'zustand';

function getMaxNumberOfFunctionsPerBuilding(): number {
  const buildings = useModelStore.getState().buildings;
  return Math.max(
    ...Object.values(buildings).map((b) => b.functionIds?.length || 0),
    0
  );
}

export enum SelectedBuildingHeatmapMetric {
  None = 'None',
  Functions = 'Function Count',
  loc = 'loc',
  cloc = 'cloc',
  size = 'size',
  DynamicFunctions = 'Dynamic Function Quota',
  StaticFunctions = 'Static Function Quota',
}

export enum BuildingMetricIds {
  None = 'None',
  Functions = 'Function Count',
  loc = 'loc',
  cloc = 'cloc',
  size = 'size',
  DynamicFunctions = 'Dynamic Function Quota',
  StaticFunctions = 'Static Function Quota',
}

const NO_SELECTED_METRIC: BuildingMetric = {
  name: BuildingMetricIds.None,
  description: 'No metric selected',
  min: 0,
  max: 0,
};

export enum HeatmapGradient {
  DEFAULT_GRADIENT = 'Default',
  TEMPERATURE_GRADIENT = 'Temperature',
  MONOCHROME_GRADIENT = 'Monochrome',
}

export type BuildingMetric = {
  name: string;
  description: string;
  min: number;
  max: number;
};

interface HeatmapConfigurationState {
  heatmapShared: boolean; // tracked
  legendActive: boolean;
  selectedBuildingMetric: BuildingMetric; //tracked
  selectedGradient: HeatmapGradient;
  opacityValue: number;
  showLegendValues: boolean;
  toggleShared: () => void;
  isActive: () => boolean;
  getSelectedBuildingMetric: () => BuildingMetric | undefined;
  setSelectedBuildingMetric: (metricName: BuildingMetricIds) => void;
  getSelectedGradient: () => HeatmapGradient;
  setSelectedGradient: (gradient: HeatmapGradient) => void;
  toggleLegend: () => void;
  cleanup: () => void;
  setShowLegendValues: (show: boolean) => void;
}
export const useHeatmapStore = create<HeatmapConfigurationState>(
  (set, get) => ({
    heatmapActive: true,
    heatmapShared: false,
    legendActive: true,
    selectedBuildingMetric: {
      name: BuildingMetricIds.None,
      description: 'No metric selected',
      min: 0,
      max: 0,
    },
    selectedGradient: HeatmapGradient.DEFAULT_GRADIENT,
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
          .value && get().selectedBuildingMetric.name !== BuildingMetricIds.None
      );
    },

    getSelectedBuildingMetric: () => {
      return get().selectedBuildingMetric;
    },

    setSelectedBuildingMetric: (metricName: BuildingMetricIds) => {
      switch (metricName) {
        case BuildingMetricIds.Functions:
          set({
            selectedBuildingMetric: {
              name: BuildingMetricIds.Functions,
              description: "Number of functions in building's data model",
              min: 0,
              max: getMaxNumberOfFunctionsPerBuilding(),
            },
          });
          break;

        case BuildingMetricIds.loc:
        case BuildingMetricIds.cloc:
        case BuildingMetricIds.size:
          set({
            selectedBuildingMetric: {
              name: metricName,
              description: `${metricName} of building's data model`,
              min: 0,
              max: 5000, // ToDo: Get max value
            },
          });
          break;

        case BuildingMetricIds.DynamicFunctions:
          set({
            selectedBuildingMetric: {
              name: BuildingMetricIds.DynamicFunctions,
              description: "Dynamic function quota of building's data model",
              min: 0,
              max: 1, // Percentage, so max is 1
            },
          });
          break;

        case BuildingMetricIds.StaticFunctions:
          set({
            selectedBuildingMetric: {
              name: BuildingMetricIds.StaticFunctions,
              description: "Static function quota of building's data model",
              min: 0,
              max: 1, // In percentage, so max is 1
            },
          });
          break;

        default:
          set({
            selectedBuildingMetric: NO_SELECTED_METRIC,
          });
          break;
      }
    },
    getSelectedGradient: () => {
      return get().selectedGradient;
    },
    setSelectedGradient: (gradient: HeatmapGradient) => {
      set({ selectedGradient: gradient });
    },
    toggleLegend: () => {
      set({ legendActive: !get().legendActive });
    },

    /**
     * Reset all attribute values to null;
     */
    cleanup: () => {
      set({
        selectedBuildingMetric: NO_SELECTED_METRIC,
        legendActive: true,
        heatmapShared: false,
      });
    },
  })
);
