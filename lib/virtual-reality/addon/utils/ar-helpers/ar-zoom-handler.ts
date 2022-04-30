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

  private outerDiv: HTMLElement;

  constructor(camera: THREE.PerspectiveCamera, outerDiv: HTMLElement, arSettings: ArSettings) {
    this.mainCamera = camera;
    this.zoomCamera = camera.clone();
    this.outerDiv = outerDiv;
    this.arSettings = arSettings;
    this.zoomEnabled = false;
  }

  enableZoom() {
    this.zoomEnabled = true;
    this.zoomCamera = this.mainCamera.clone();
  }

  disableZoom() {
    this.zoomEnabled = false;
  }

  renderZoomCamera(renderer: THREE.WebGLRenderer, scene: THREE.Scene,
    resize: (outerDiv: HTMLElement) => void) {
    if (!this.zoomEnabled) return;

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

    const canvas = renderer.domElement;

    renderer.setScissorTest(true);

    this.zoomCamera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.zoomCamera.updateProjectionMatrix();

    renderer.setViewport(zoomPos.x, zoomPos.y, zoomSize.x, zoomSize.y);
    renderer.setScissor(zoomPos.x, zoomPos.y, zoomSize.x, zoomSize.y);

    renderer.render(scene, this.zoomCamera);

    renderer.setScissorTest(false);

    renderer.setViewport(0, 0, this.outerDiv.clientWidth, this.outerDiv.clientHeight);

    resize(this.outerDiv);
  }
}
