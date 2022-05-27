import THREE from 'three';
import VRController from '../vr-controller';
import { ControllerPose, Pose } from '../vr-message/sendable/user_positions';
import { Position } from '../vr-message/util/position';

export interface VrPose {
  camera: Pose;
  cameraTarget: Position;
  controller1: ControllerPose | undefined;
  controller2: ControllerPose | undefined;
}

export function getCameraPose(camera: THREE.Camera): Pose {
  return {
    position: camera.getWorldPosition(new THREE.Vector3()).toArray(),
    quaternion: camera.quaternion.toArray(),
  };
}

export function getObjectPose(object: THREE.Object3D): Pose {
  return {
    position: object.getWorldPosition(new THREE.Vector3()).toArray(),
    quaternion: object.getWorldQuaternion(new THREE.Quaternion()).toArray(),
  };
}

export function getControllerPose(controller: VRController): ControllerPose {
  controller.updateIntersectedObject();
  return {
    intersection: controller.intersectedObject?.point?.toArray() || null,
    ...getObjectPose(controller.raySpace),
  };
}

export function getPoses(
  camera: THREE.Camera,
  cameraTarget: THREE.Vector3,
  controller1: VRController | undefined,
  controller2: VRController | undefined,
): VrPose {
  return {
    camera: getCameraPose(camera),
    cameraTarget: cameraTarget.toArray(),
    controller1: controller1 && getControllerPose(controller1),
    controller2: controller2 && getControllerPose(controller2),
  };
}
