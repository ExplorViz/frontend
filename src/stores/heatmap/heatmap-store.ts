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
  size = 'size',
  lineCount = 'lineCount',
  sloc = 'sloc',
  cloc = 'cloc',
  importCount = 'importCount',
  classCount = 'classCount',
  functionCount = 'functionCount',
  variableCount = 'variableCount',
}

export enum BuildingMetricIds {
  None = 'None',
  size = 'size',
  lineCount = 'lineCount',
  sloc = 'sloc',
  cloc = 'cloc',
  importCount = 'importCount',
  classCount = 'classCount',
  functionCount = 'functionCount',
  variableCount = 'variableCount',
}

export const ORDERED_BUILDING_METRIC_IDS: BuildingMetricIds[] = [
  BuildingMetricIds.None,
  BuildingMetricIds.size,
  BuildingMetricIds.lineCount,
  BuildingMetricIds.sloc,
  BuildingMetricIds.cloc,
  BuildingMetricIds.importCount,
  BuildingMetricIds.classCount,
  BuildingMetricIds.functionCount,
  BuildingMetricIds.variableCount,
];

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

export enum HeatmapValueMapping {
  LINEAR = 'Linear Mapping',
  LOGARITHMIC = 'Logarithmic Mapping',
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
  selectedValueMapping: HeatmapValueMapping;
  opacityValue: number;
  showLegendValues: boolean;
  toggleShared: () => void;
  isActive: () => boolean;
  getSelectedBuildingMetric: () => BuildingMetric | undefined;
  setSelectedBuildingMetric: (metricName: BuildingMetricIds) => void;
  getSelectedGradient: () => HeatmapGradient;
  setSelectedGradient: (gradient: HeatmapGradient) => void;
  getSelectedValueMapping: () => HeatmapValueMapping;
  setSelectedValueMapping: (mapping: HeatmapValueMapping) => void;
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
    selectedValueMapping: HeatmapValueMapping.LINEAR,
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
        case BuildingMetricIds.size:
        case BuildingMetricIds.lineCount:
        case BuildingMetricIds.sloc:
        case BuildingMetricIds.cloc:
        case BuildingMetricIds.importCount:
        case BuildingMetricIds.classCount:
        case BuildingMetricIds.functionCount:
        case BuildingMetricIds.variableCount: {
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
    getSelectedValueMapping: () => {
      return get().selectedValueMapping;
    },
    setSelectedValueMapping: (mapping: HeatmapValueMapping) => {
      set({ selectedValueMapping: mapping });
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
        selectedValueMapping: HeatmapValueMapping.LINEAR,
      });
    },
  })
);
