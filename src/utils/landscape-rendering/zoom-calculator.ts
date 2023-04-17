import * as THREE from 'three';
import MinMaxRectangle from '../../view-objects/layout-models/min-max-rectangle';

/**
 * Takes a landscape rectangle and renderer to calculate and apply a new camera zoom.
 *
 * @param landscapeRect Contains min/max positions of landscape
 * @param camera Object to which the zoom is applied
 * @param renderer Renderer is needed to calculate viewPortSize
 */
export default function updateCameraZoom(
  landscapeRect: MinMaxRectangle,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
  const INITIAL_CAM_ZOOM = 0;
  // Update zoom only if camera has not been moved by user
  if (camera.position.z !== INITIAL_CAM_ZOOM) {
    return;
  }

  // Add 2% to calculated space
  const EXTRA_SPACE_IN_PERCENT = 1.02;
  const SIZE_FACTOR = 0.65;

  const requiredWidth = landscapeRect.width * EXTRA_SPACE_IN_PERCENT;
  const requiredHeight = landscapeRect.height * EXTRA_SPACE_IN_PERCENT;

  const viewPortSize = new THREE.Vector2();
  renderer.getSize(viewPortSize);

  const viewportRatio = viewPortSize.width / viewPortSize.height;

  const newZByWidth = (requiredWidth / viewportRatio) * SIZE_FACTOR;
  const newZByHeight = requiredHeight * SIZE_FACTOR;

  camera.position.z = Math.max(newZByHeight, newZByWidth, 10.0);
  camera.updateProjectionMatrix();
}
