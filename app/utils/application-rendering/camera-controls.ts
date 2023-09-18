import gsap from 'gsap';
import {
  Box3,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { setOwner } from '@ember/application';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';

export default class CameraControls {
  @service('user-settings')
  userSettings!: UserSettings;

  private perspectiveCamera: PerspectiveCamera;
  private orthographicCamera: OrthographicCamera | undefined;

  perspectiveCameraControls: MapControls;
  orthographicCameraControls: MapControls | undefined;

  activeControls: MapControls;

  enabled: boolean = true;

  constructor(
    owner: any,
    perspectiveCamera: PerspectiveCamera,
    orthographicCamera: OrthographicCamera | undefined,
    canvas: HTMLCanvasElement
  ) {
    setOwner(this, owner);
    this.perspectiveCamera = perspectiveCamera;
    this.orthographicCamera = orthographicCamera;

    this.perspectiveCameraControls = new MapControls(
      this.perspectiveCamera,
      canvas
    );
    this.perspectiveCameraControls.enableDamping = true;
    this.perspectiveCameraControls.dampingFactor = 0.3;
    this.perspectiveCameraControls.minDistance = 0.1;
    this.perspectiveCameraControls.maxDistance = 1000;
    this.perspectiveCameraControls.maxPolarAngle = Math.PI / 2;
    this.perspectiveCameraControls.mouseButtons.MIDDLE = undefined;

    if (orthographicCamera) {
      this.orthographicCameraControls = new MapControls(
        this.orthographicCamera!,
        canvas
      );
    }

    if (this.userSettings.applicationSettings.useOrthographicCamera.value) {
      this.activeControls = this.orthographicCameraControls!;
    } else {
      this.activeControls = this.perspectiveCameraControls;
    }
    owner.addObserver(
      'this.userSettings.applicationSettings.useOrthographicCamera',
      owner,
      'cameraChanged'
    );
  }

  cameraChanged() {
    console.log('asdasdasd');
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
      maxSize / (2 * Math.atan((Math.PI * this.perspectiveCamera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.perspectiveCamera.aspect;
    const distance =
      0.1 + Math.max(fitHeightDistance, fitWidthDistance) * fitOffset;

    const origin = keepCameraPerspective
      ? this.perspectiveCamera.position
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
      this.perspectiveCamera.position.copy(position);
      this.perspectiveCameraControls.target.copy(center);
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
    gsap.to(this.perspectiveCamera.position, {
      duration,
      x: position.x,
      y: position.y,
      z: position.z,
      onUpdate: () => {
        this.perspectiveCamera.updateProjectionMatrix();
      },
    });

    gsap.to(this.perspectiveCameraControls.target, {
      duration,
      x: target.x,
      y: target.y,
      z: target.z,
      onUpdate: () => {
        this.perspectiveCameraControls.update();
      },
    });
  }

  tick() {
    if (this.enabled) {
      this.perspectiveCameraControls.update();
    }
  }
}
