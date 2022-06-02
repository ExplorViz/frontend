import THREE from 'three';
import ArSettings from 'virtual-reality/services/ar-settings';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ArZoomHandler {
  @service('ar-settings')
  arSettings!: ArSettings;

  private mainCamera: THREE.PerspectiveCamera;

  private zoomCamera: THREE.PerspectiveCamera;

  @tracked
  zoomEnabled: boolean;

  constructor(camera: THREE.PerspectiveCamera, arSettings: ArSettings) {
    this.mainCamera = camera;
    this.zoomCamera = camera.clone();
    this.arSettings = arSettings;
    this.zoomEnabled = false;
  }

  enableZoom() {
    this.zoomEnabled = true;
  }

  disableZoom() {
    this.zoomEnabled = false;
  }

  // has to be rendered after the normal render
  renderZoomCamera(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    if (!this.zoomEnabled) return;
    renderer.xr.enabled = false;

    const width = window.screen.height
    const height = window.screen.width
    this.zoomCamera.quaternion.copy(this.mainCamera.quaternion);

    const originalSize = renderer.getSize(new THREE.Vector2());

    const { zoomLevel } = this.arSettings;

    const zoomSize = {
      x: originalSize.x / 3,
      y: originalSize.y / 3,
    };

    const zoomPos = {
      x: originalSize.x / 2 - zoomSize.x / 2,
      y: originalSize.y / 2 - zoomSize.y / 2,
    };

    const zoomOffset = {
      x: zoomSize.x + zoomSize.x / 2 - (zoomSize.x / zoomLevel) / 2,
      y: zoomSize.y + zoomSize.y / 2 - (zoomSize.y / zoomLevel) / 2,
    };

    this.zoomCamera.setViewOffset(
      originalSize.x,
      originalSize.y,
      zoomOffset.x,
      zoomOffset.y,
      zoomSize.x / zoomLevel,
      zoomSize.y / zoomLevel,
    );

    renderer.setScissorTest(true);

    this.zoomCamera.aspect = width / height;
    this.zoomCamera.updateProjectionMatrix();

    renderer.setViewport(zoomPos.x, zoomPos.y, zoomSize.x * 2, zoomSize.y * 2);
    renderer.setScissor(zoomPos.x, zoomPos.y, zoomSize.x * 2, zoomSize.y * 2);

    renderer.render(scene, this.zoomCamera);

    renderer.setScissorTest(false);

    renderer.setViewport(0, 0, width, height);

    renderer.xr.enabled = true;
  }
}
