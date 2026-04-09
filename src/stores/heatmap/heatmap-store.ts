import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { create } from 'zustand';

function getMinMaxMetricValues(metricName: BuildingMetricIds): {
  min: number;
  max: number;
} {
  const buildings = useModelStore.getState().buildings;
  const buildingsArray = Object.values(buildings);

  if (buildingsArray.length === 0) return { min: 0, max: 0 };

  return buildingsArray.reduce(
    (acc, b) => {
      const val = b.metrics?.[metricName]?.current || (b as any)[metricName] || 0;
      return {
        min: Math.min(acc.min, val),
        max: Math.max(acc.max, val),
      };
    },
    { min: Infinity, max: -Infinity }
  );
}

export enum SelectedBuildingHeatmapMetric {
  None = 'None',
  loc = 'loc',
  sloc = 'sloc',
  cloc = 'cloc',
  functionCount = 'functionCount',
  variableCount = 'variableCount',
  size = 'size',
}

export enum BuildingMetricIds {
  None = 'None',
  loc = 'loc',
  sloc = 'sloc',
  cloc = 'cloc',
  functionCount = 'functionCount',
  variableCount = 'variableCount',
  size = 'size',
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
        case BuildingMetricIds.loc:
        case BuildingMetricIds.sloc:
        case BuildingMetricIds.cloc:
        case BuildingMetricIds.functionCount:
        case BuildingMetricIds.variableCount:
        case BuildingMetricIds.size: {
          const { min, max } = getMinMaxMetricValues(metricName);
          set({
            selectedBuildingMetric: {
              name: metricName,
              description: `${metricName} of building's data model`,
              min: min,
              max: max,
            },
          });
          break;
        }

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
