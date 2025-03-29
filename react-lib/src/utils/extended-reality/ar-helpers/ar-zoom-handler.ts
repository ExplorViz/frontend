import * as THREE from 'three';
import { useARSettingsStore } from 'react-lib/src/stores/extended-reality/ar-settings';

export default class ArZoomHandler {
  private mainCamera: THREE.PerspectiveCamera;

  private zoomCamera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.mainCamera = camera;
    this.zoomCamera = camera.clone();
  }

  // has to be rendered after the normal render
  renderZoomCamera(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    if (!useARSettingsStore.getState().zoomEnabled) return;
    renderer.xr.enabled = false;

    // const width = window.screen.width // for chrome fullscreen
    // const height = window.screen.height // for chrome fullscreen
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.zoomCamera.quaternion.copy(this.mainCamera.quaternion);
    this.zoomCamera.position.copy(this.mainCamera.position);

    const originalSize = renderer.getSize(new THREE.Vector2());

    const zoomLevel = useARSettingsStore.getState().zoomLevel;

    const zoomSize = {
      x: originalSize.x / 3,
      y: originalSize.y / 3,
    };

    const zoomPos = {
      x: originalSize.x / 2 - zoomSize.x / 2,
      y: originalSize.y / 2 - zoomSize.y / 2,
    };

    const zoomOffset = {
      x: zoomSize.x + zoomSize.x / 2 - zoomSize.x / zoomLevel / 2,
      y: zoomSize.y + zoomSize.y / 2 - zoomSize.y / zoomLevel / 2,
    };

    this.zoomCamera.setViewOffset(
      originalSize.x,
      originalSize.y,
      zoomOffset.x,
      zoomOffset.y,
      zoomSize.x / zoomLevel,
      zoomSize.y / zoomLevel
    );

    renderer.setScissorTest(true);

    this.zoomCamera.aspect = width / height;
    this.zoomCamera.updateProjectionMatrix();

    // add border
    renderer.setScissor(
      zoomPos.x - 4,
      zoomPos.y - 4,
      zoomSize.x * 2 + 8,
      zoomSize.y * 2 + 8
    );
    renderer.setClearColor(0xffffff, 1); // border color
    renderer.clearColor(); // clear color buffer

    // render zoom content
    renderer.setViewport(zoomPos.x, zoomPos.y, zoomSize.x * 2, zoomSize.y * 2);
    renderer.setScissor(zoomPos.x, zoomPos.y, zoomSize.x * 2, zoomSize.y * 2);
    renderer.setClearColor(0x000000, 0); // border color

    renderer.render(scene, this.zoomCamera);

    renderer.setScissorTest(false);

    renderer.setViewport(0, 0, width, height);

    renderer.xr.enabled = true;
  }
}
