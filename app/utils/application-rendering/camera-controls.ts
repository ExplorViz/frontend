import gsap from 'gsap';
import {
  Box3, Object3D, PerspectiveCamera, Vector3
} from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';

export class CameraControls {

  private camera: PerspectiveCamera;

  controls: MapControls;

  constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;

    const controls = new MapControls(this.camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.3;
    controls.minDistance = 1;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2;
    this.controls = controls;
  }

  fitCameraToBox(duration: number = 0, box: Box3) {
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const fitOffset = 1.2;
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance = 2 + Math.max(fitHeightDistance, fitWidthDistance) * fitOffset;
    const direction = this.controls.target.clone()
      .sub(this.camera.position)
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

  focusCameraOn(duration: number = 1, ...selection: Object3D[]) {
    const box = new Box3();
    selection.forEach((object) => {
      box.expandByObject(object)
    })

    this.fitCameraToBox(duration, box);
  }

  panCameraTo(position: Vector3, target: Vector3, duration: number) {
    gsap.to(this.camera.position, {
      duration,
      x: position.x,
      y: position.y,
      z: position.z,
      onUpdate: () => {
        this.camera.updateProjectionMatrix();
      }
    });

    gsap.to(this.controls.target, {
      duration,
      x: target.x,
      y: target.y,
      z: target.z,
      onUpdate: () => {
        this.controls.update();
      }
    });

  }

  tick() {
    this.controls.update();
  }
}
