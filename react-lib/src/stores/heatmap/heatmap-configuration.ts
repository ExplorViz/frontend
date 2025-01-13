import { createStore } from "zustand/vanilla";

import { getDefaultGradient as getSimpleDefaultGradient } from "react-lib/src/utils/heatmap/simple-heatmap";

export type HeatmapMode =
  | "snapshotHeatmap"
  | "aggregatedHeatmap"
  | "windowedHeatmap";

interface HeatmapConfigurationState {
  heatmapActive: boolean;
  heatmapShared: boolean;
  // currentApplication?: ApplicationObject3D | undefined | null;
  largestValue: number;
  legendActive: boolean;
  windowSize: number;
  selectedMode: HeatmapMode;
  selectedMetricName: string;
  useHelperLines: boolean;
  opacityValue: number;
  heatmapRadius: number;
  blurRadius: number;
  showLegendValues: boolean;
  simpleHeatGradient: any; // TODO maybe turn into interface
}

export const useHeatmapConfigurationStore =
  createStore<HeatmapConfigurationState>((set, get) => ({
    heatmapActive: false,
    heatmapShared: false,
    // TODO migrate ApplicationObject3D first
    // currentApplication: undefined,
    legendActive: true,
    // TODO this is never assigned another value, but used in calculation. What is it supposed to do?
    largestValue: 0,
    windowSize: 9,
    // TODO methods
    selectedMode: "snapshotHeatmap",
    selectedMetricName: "Instance Count",
    useHelperLines: true,
    opacityValue: 0.03,
    heatmapRadius: 2,
    blurRadius: 0,
    showLegendValues: true,
    simpleHeatGradient: getSimpleDefaultGradient(),
  }));
