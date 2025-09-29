import {
  HeatmapGradient,
  useHeatmapStore,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import simpleheat from 'simpleheat';

export function getColorGradient(): Gradient {
  const gradientSetting = useHeatmapStore.getState().selectedGradient;

  switch (gradientSetting) {
    case HeatmapGradient.TEMPERATURE_GRADIENT:
      return getTemperatureGradient();
    case HeatmapGradient.MONOCHROME_GRADIENT:
      return getMonochromeGradient();
    default:
      return getDefaultColorGradient();
  }
}

export function getDefaultColorGradient() {
  return {
    '0_00': 'rgb(0, 0, 255)',
    '0_10': 'rgb(0, 153, 255)',
    '0_20': 'rgb(0, 255, 255)',
    '0_30': 'rgb(0, 255, 100)',
    '0_50': 'rgb(0, 255, 0)',
    '0_60': 'rgb(175, 255, 0)',
    '0_70': 'rgb(255, 255, 0)',
    '0_80': 'rgb(255, 175, 0)',
    '0_90': 'rgb(255, 125, 0)',
    '1_00': 'rgb(255, 0, 0)',
  };
}

export function getTemperatureGradient() {
  return {
    '0_00': 'rgb(0, 0, 255)',
    '1_00': 'rgb(255, 0, 0)',
  };
}

export function getMonochromeGradient() {
  return {
    '0_00': 'rgb(255, 255, 255)',
    '1_00': 'rgb(0, 0, 0)',
  };
}

/**
 * Convert "rgb(r, g, b)" (or "rgba(r,g,b,a)") into [r,g,b].
 */
function parseRgb(s: string): RGB {
  const m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!m) throw new Error(`Invalid RGB color: ${s}`);
  const r = Math.min(255, Math.max(0, Number(m[1])));
  const g = Math.min(255, Math.max(0, Number(m[2])));
  const b = Math.min(255, Math.max(0, Number(m[3])));
  return [r, g, b];
}

function toRgbString([r, g, b]: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Turns gradient object into sorted numeric stops in [0,1].
 */
function stopsFromGradient(gradient: Gradient): { pos: number; color: RGB }[] {
  const stops = Object.entries(gradient)
    .map(([k, v]) => ({
      pos: parseFloat(k.replace('_', '.')),
      color: parseRgb(v),
    }))
    .filter((s) => Number.isFinite(s.pos))
    .sort((a, b) => a.pos - b.pos);

  if (stops.length === 0) {
    throw new Error('Gradient has no valid stops.');
  }

  // Ensure hard boundaries at 0 and 1 for safety.
  if (stops[0].pos > 0) stops.unshift({ pos: 0, color: stops[0].color });
  if (stops[stops.length - 1].pos < 1)
    stops.push({ pos: 1, color: stops[stops.length - 1].color });

  return stops;
}

/**
 * Returns a color for a given value and maximum, using linear interpolation
 * between the supplied gradient stops.
 *
 * @param value The current value.
 * @param max The maximum value (values are normalized to value/max).
 * @param gradient Optional gradient mapping; defaults to getDefaultGradient().
 * @returns An RGB string like "rgb(255, 0, 0)".
 */
export function getSimpleHeatmapColor(
  value: number,
  max: number,
  gradient: Gradient = getColorGradient()
): string {
  const ratio =
    max > 0 && Number.isFinite(max) ? Math.min(1, Math.max(0, value / max)) : 0;

  const stops = stopsFromGradient(gradient);

  // Quick clamps
  if (ratio <= stops[0].pos) return toRgbString(stops[0].color);
  if (ratio >= stops[stops.length - 1].pos)
    return toRgbString(stops[stops.length - 1].color);

  // Find the interval [a, b] such that a.pos <= ratio <= b.pos
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (ratio >= a.pos && ratio <= b.pos) {
      const t = (ratio - a.pos) / Math.max(1e-12, b.pos - a.pos);
      const rgb: RGB = [
        Math.round(lerp(a.color[0], b.color[0], t)),
        Math.round(lerp(a.color[1], b.color[1], t)),
        Math.round(lerp(a.color[2], b.color[2], t)),
      ];
      return toRgbString(rgb);
    }
  }

  // Fallback (shouldn’t hit due to clamps)
  return toRgbString(stops[stops.length - 1].color);
}

// Needed to revert keys of default gradient for heatmap legend
export function revertKey(gradient: Gradient) {
  const replacedItems = Object.keys(gradient).map((key) => ({
    [key.replace(/_/g, '.').replace(/\+/g, '')]: gradient[key],
  }));
  return Object.assign({}, ...replacedItems);
}

export default function simpleHeatmap(
  maximumValue: number,
  canvas: HTMLCanvasElement,
  gradient: any,
  heatmapRadius: number,
  blurRadius: number
) {
  const simpleHeatMap = simpleheat(canvas);
  simpleHeatMap.radius(heatmapRadius, blurRadius);
  simpleHeatMap.max(maximumValue);
  simpleHeatMap.gradient(gradient);
  return simpleHeatMap;
}

type RGB = [number, number, number];
export type Gradient = {
  [value: string]: string;
};
