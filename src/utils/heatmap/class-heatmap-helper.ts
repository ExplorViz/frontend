import {
  ClassMetric,
  SelectedClassHeatmapMetric,
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

export function getMetricValues(
  dataModel: Class,
  classHeatmapMetric: ClassMetric
): { min: number; max: number; current: number } {
  switch (classHeatmapMetric.name) {
    case SelectedClassHeatmapMetric.Methods:
      return {
        min: classHeatmapMetric.min,
        max: classHeatmapMetric.max,
        current: dataModel.methods.length,
      };
    case SelectedClassHeatmapMetric.DynamicMethods:
      return {
        min: classHeatmapMetric.min,
        max: dataModel.methods.length,
        current: dataModel.methods.filter(
          (m) =>
            m.originOfData === TypeOfAnalysis.Dynamic ||
            m.originOfData === TypeOfAnalysis.StaticAndDynamic
        ).length,
      };
    case SelectedClassHeatmapMetric.StaticMethods:
      return {
        min: classHeatmapMetric.min,
        max: dataModel.methods.length,
        current: dataModel.methods.filter(
          (m) =>
            m.originOfData === TypeOfAnalysis.Static ||
            m.originOfData === TypeOfAnalysis.StaticAndDynamic
        ).length,
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
  dataModel: Class,
  classHeatmapMetric: ClassMetric,
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
