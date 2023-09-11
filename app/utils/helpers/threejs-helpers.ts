import * as THREE from 'three';

/**
* This method calculates a new color with a different brightness
* degree as the passed color.
*
* @method calculateColorBrightness
* @param {THREE.Color} threeColor A Three.js color object
* @param {Number} brightnessDegree The new brightness degree, e.g.,
    '1.1' results in 10 percent lighter color
*
* @module explorviz
* @submodule util
*/
export default function calculateColorBrightness(
  threeColor: THREE.Color,
  brightnessDegree: number
): THREE.Color {
  const r = clamp(0, threeColor.r * brightnessDegree, 1);
  const g = clamp(0, threeColor.g * brightnessDegree, 1);
  const b = clamp(0, threeColor.b * brightnessDegree, 1);

  return new THREE.Color(r, g, b);
}

function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}
