import {
  BuildingMetric,
  BuildingMetricIds,
  SelectedBuildingHeatmapMetric,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import {
  Class,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function interpolateColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export function getMetricValues(
  dataModel: Class | Building,
  classHeatmapMetric: BuildingMetric
): { min: number; max: number; current: number } {
  const isBuilding = (x: any): x is Building =>
    Object.prototype.hasOwnProperty.call(x, 'parentCityId');

  const getMethodsCount = (model: Class | Building) => {
    if (isBuilding(model)) {
      return model.functionIds?.length || 0;
    }
    return (model as Class).methods.length;
  };

  const getDynamicMethodsCount = (model: Class | Building) => {
    if (isBuilding(model)) {
      // For now, we don't have originOfData per function in Building
      // but we can assume if it exists in dynamic data, it's counted.
      // However, Building.metrics might already have this.
      return model.metrics?.dynamicFunctions || 0;
    }
    return (model as Class).methods.filter(
      (m) =>
        m.originOfData === TypeOfAnalysis.Dynamic ||
        m.originOfData === TypeOfAnalysis.StaticAndDynamic
    ).length;
  };

  const getStaticMethodsCount = (model: Class | Building) => {
    if (isBuilding(model)) {
      return model.metrics?.staticFunctions || 0;
    }
    return (model as Class).methods.filter(
      (m) =>
        m.originOfData === TypeOfAnalysis.Static ||
        m.originOfData === TypeOfAnalysis.StaticAndDynamic
    ).length;
  };

  const getLinesOfCode = (model: Class | Building) => {
    if (isBuilding(model)) {
      return model.metrics?.linesOfCode || 0;
    }
    return (model as any).linesOfCode || 0;
  };

  switch (classHeatmapMetric.name) {
    case BuildingMetricIds.Functions:
    case SelectedBuildingHeatmapMetric.Functions:
      return {
        min: classHeatmapMetric.min,
        max: classHeatmapMetric.max,
        current: getMethodsCount(dataModel),
      };
    case BuildingMetricIds.DynamicFunctions:
    case SelectedBuildingHeatmapMetric.DynamicFunctions:
      return {
        min: classHeatmapMetric.min,
        max: getMethodsCount(dataModel),
        current: getDynamicMethodsCount(dataModel),
      };
    case BuildingMetricIds.StaticFunctions:
    case SelectedBuildingHeatmapMetric.StaticFunctions:
      return {
        min: classHeatmapMetric.min,
        max: getMethodsCount(dataModel),
        current: getStaticMethodsCount(dataModel),
      };
    case BuildingMetricIds.LoC:
    case SelectedBuildingHeatmapMetric.LoC:
      return {
        min: classHeatmapMetric.min,
        max: classHeatmapMetric.max,
        current: getLinesOfCode(dataModel),
      };
    default:
      return {
        min: 0,
        max: 0,
        current: 0,
      };
  }
}

export function getHeatmapColor(
  dataModel: Class | Building,
  classHeatmapMetric: BuildingMetric,
  minColor: string,
  avgColor: string,
  maxColor: string
): string {
  const { min, max, current } = getMetricValues(dataModel, classHeatmapMetric);
  // Edge cases for min and max
  if (current <= min) {
    return minColor;
  }
  if (current >= max) {
    return maxColor;
  }
  const avg = (min + max) / 2;

  const minRGB = hexToRgb(minColor);
  const avgRGB = hexToRgb(avgColor);
  const maxRGB = hexToRgb(maxColor);

  if (current <= avg) {
    const t = (current - min) / (avg - min || 1); // Avoid divide by 0
    return rgbToHex(interpolateColor(minRGB, avgRGB, t));
  } else {
    const t = (current - avg) / (max - avg || 1);
    return rgbToHex(interpolateColor(avgRGB, maxRGB, t));
  }
}
