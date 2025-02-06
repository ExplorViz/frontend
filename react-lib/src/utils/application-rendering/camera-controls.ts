import gsap from 'gsap';
import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { MapControls } from 'react-lib/src/utils/controls/MapControls';
import SemanticZoomManager from 'react-lib/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { ImmersiveView } from 'explorviz-frontend/rendering/application/immersive-view';

export default class CameraControls {
  private perspectiveCamera: PerspectiveCamera;

  perspectiveCameraControls: MapControls;
  enabled: boolean = true;

  lastTargetPosition: THREE.Vector3;
  lastCameraPosition: THREE.Vector3;
  lastQuaternion: THREE.Quaternion;
  lastDistance: number;

  constructor(perspectiveCamera: PerspectiveCamera, canvas: HTMLCanvasElement) {
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
    // Semantic Zoom trigger Level Decision
    SemanticZoomManager.instance.registerCam(this.perspectiveCamera);
    this.perspectiveCameraControls.addEventListener('end', () => {
      SemanticZoomManager.instance.triggerLevelDecision2WithDebounce(
        this.perspectiveCamera
      );
    });
    //
    // ImmersiveView Tracker
    this.lastDistance = perspectiveCamera.position.distanceTo(
      this.perspectiveCameraControls.target
    );
    this.lastTargetPosition = this.perspectiveCameraControls.target.clone();
    this.lastCameraPosition = this.perspectiveCamera.position.clone();
    this.lastQuaternion = this.perspectiveCamera.quaternion.clone();

    this.perspectiveCameraControls.addEventListener('end', () => {
      const currentDistance = this.perspectiveCamera.position.distanceTo(
        this.perspectiveCameraControls.target
      );
      const currentTargetPosition = this.perspectiveCameraControls.target;
      const currentQuaternion = this.perspectiveCamera.quaternion;

      // Detect Zoom In or Out
      if (Math.abs(currentDistance - this.lastDistance) > 0.001) {
        if (currentDistance < this.lastDistance) {
          //console.log('Zooming in');
          // TODO: Enable this for entering immersive view with scroll wheel
          // ImmersiveView.instance.takeAction('zoomin');
        } else {
          //console.log('Zooming out');
          ImmersiveView.instance.takeAction('zoomout');
        }
      }

      // Detect Pan
      else if (
        currentTargetPosition.distanceTo(this.lastTargetPosition) > 0.001 &&
        currentDistance === this.lastDistance
      ) {
        //console.log('Pan occurred');
        ImmersiveView.instance.takeAction('move');
      }

      // Detect Rotation (Tilt)
      else if (!currentQuaternion.equals(this.lastQuaternion)) {
        //console.log('Rotation occurred');
        ImmersiveView.instance.takeAction('rotate');
      }

      // Update previous values for the next change event
      this.lastDistance = currentDistance;
      this.lastTargetPosition.copy(currentTargetPosition);
      this.lastQuaternion.copy(currentQuaternion);
      this.lastCameraPosition.copy(this.perspectiveCamera.position);
    });

    ImmersiveView.instance.registerMapControl(this.perspectiveCameraControls);
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

    const maxSize = Math.max(size.x, size.y, size.z);

    // Fit perspective camera
    const fitHeightDistance =
      maxSize / (2 * Math.atan((Math.PI * this.perspectiveCamera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.perspectiveCamera.aspect;

    const distance = Math.max(fitHeightDistance, fitWidthDistance);

    const origin = keepCameraPerspective
      ? this.perspectiveCamera.position
      : box.max;

    const direction = center
      .clone()
      .sub(origin)
      .normalize()
      .multiplyScalar(distance);

    const position = center.clone().sub(direction);

    // Avoid camera being too high
    position.y = Math.min(position.y, 20);

    // Center to turn camera around should always be on ground level
    center.y = 0;

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

  resetCameraFocusOn(duration: number = 1, selection: Object3D[]) {
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
