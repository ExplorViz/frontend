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
  const r = Math.floor(threeColor.r * brightnessDegree * 255);
  const g = Math.floor(threeColor.g * brightnessDegree * 255);
  const b = Math.floor(threeColor.b * brightnessDegree * 255);

  return new THREE.Color(`rgb(${r},${g},${b})`);
}
