import gsap from 'gsap';
import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { setOwner } from '@ember/application';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import { MapControls } from '../controls/MapControls';

export default class CameraControls {
  @service('user-settings')
  userSettings!: UserSettings;

  private perspectiveCamera: PerspectiveCamera;

  perspectiveCameraControls: MapControls;
  enabled: boolean = true;

  constructor(
    owner: any,
    perspectiveCamera: PerspectiveCamera,
    canvas: HTMLCanvasElement
  ) {
    setOwner(this, owner);
    this.perspectiveCamera = perspectiveCamera;

    this.perspectiveCameraControls = new MapControls(
      this.perspectiveCamera,
      canvas
    );
    this.perspectiveCameraControls.enableDamping = true;
    this.perspectiveCameraControls.dampingFactor = 0.3;
    this.perspectiveCameraControls.minDistance = 0.1;
    this.perspectiveCameraControls.maxDistance = 1000;
    this.perspectiveCameraControls.maxPolarAngle = Math.PI / 2;
  }

  private fitCamerasToBox(
    duration: number = 0,
    box: Box3,
    keepCameraPerspective = true
  ) {
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const labelerHeightAdjustment = 1.3;
    center.y -= labelerHeightAdjustment;

    const fitOffset = 1.2;
    const maxSize = Math.max(size.x, size.y, size.z);

    // fit perspective camera

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

    const position = center.clone().sub(direction);
    if (duration > 0) {
      this.panCameraTo(
        position,
        center,
        duration,
        this.perspectiveCamera,
        this.perspectiveCameraControls
      );
    } else {
      this.perspectiveCamera.position.copy(position);
      this.perspectiveCameraControls.target.copy(center);
    }
  }

  private getBoxForSelection(...selection: Object3D[]) {
    const box = new Box3();
    selection.forEach((object) => {
      box.expandByObject(object);
    });

    return box;
  }

  focusCameraOn(duration: number = 1, ...selection: Object3D[]) {
    this.fitCamerasToBox(duration, this.getBoxForSelection(...selection));
  }

  resetCameraFocusOn(duration: number = 1, ...selection: Object3D[]) {
    this.fitCamerasToBox(
      duration,
      this.getBoxForSelection(...selection),
      false
    );
  }

  private panCameraTo(
    position: Vector3,
    target: Vector3,
    duration: number,
    camera: PerspectiveCamera,
    cameraControls: MapControls
  ) {
    gsap.to(camera.position, {
      duration,
      x: position.x,
      y: position.y,
      z: position.z,
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });

    gsap.to(cameraControls.target, {
      duration,
      x: target.x,
      y: target.y,
      z: target.z,
      onUpdate: () => {
        cameraControls.update();
      },
    });
  }

  tick() {
    if (this.enabled) {
      this.perspectiveCameraControls.update();
    }
  }
}
