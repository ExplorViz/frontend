import gsap from 'gsap';
import {
  Box3,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';

export default class CameraControls {
  private camera: PerspectiveCamera | OrthographicCamera;

  controls: MapControls;

  enabled: boolean = true;

  constructor(
    camera: PerspectiveCamera | OrthographicCamera,
    canvas: HTMLCanvasElement
  ) {
    this.camera = camera;

    const controls = new MapControls(this.camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.3;
    controls.minDistance = 0.1;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2;
    controls.mouseButtons.MIDDLE = undefined;
    this.controls = controls;
  }

  fitCameraToBox(
    duration: number = 0,
    box: Box3,
    keepCameraPerspective = true
  ) {
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const fitOffset = 1.2;
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance =
      0.1 + Math.max(fitHeightDistance, fitWidthDistance) * fitOffset;

    const origin = keepCameraPerspective
      ? this.camera.position
      : new Vector3(1, 1, 1);
    const direction = center
      .clone()
      .sub(origin)
      .normalize()
      .multiplyScalar(distance);

    // camera.near = distance / 100;
    // camera.far = distance * 100;

    const position = center.clone().sub(direction);
    if (duration > 0) {
      this.panCameraTo(position, center, duration);
    } else {
      this.camera.position.copy(position);
      this.controls.target.copy(center);
    }
  }

  getBoxForSelection(...selection: Object3D[]) {
    const box = new Box3();
    selection.forEach((object) => {
      box.expandByObject(object);
    });

    return box;
  }

  focusCameraOn(duration: number = 1, ...selection: Object3D[]) {
    this.fitCameraToBox(duration, this.getBoxForSelection(...selection));
  }

  resetCameraFocusOn(duration: number = 1, ...selection: Object3D[]) {
    this.fitCameraToBox(duration, this.getBoxForSelection(...selection), false);
  }

  panCameraTo(position: Vector3, target: Vector3, duration: number) {
    gsap.to(this.camera.position, {
      duration,
      x: position.x,
      y: position.y,
      z: position.z,
      onUpdate: () => {
        this.camera.updateProjectionMatrix();
      },
    });

    gsap.to(this.controls.target, {
      duration,
      x: target.x,
      y: target.y,
      z: target.z,
      onUpdate: () => {
        this.controls.update();
      },
    });
  }

  tick() {
    if (this.enabled) {
      this.controls.update();
    }
  }
}
