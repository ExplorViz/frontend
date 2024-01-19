import {
  Position,
  isPosition,
} from 'collaborative-mode/utils/web-socket-messages/types/position';
import {
  Quaternion,
  isQuaternion,
} from 'collaborative-mode/utils/web-socket-messages/types/quaternion';

export const USER_POSITIONS_EVENT = 'user_positions';

export type Pose = { position: Position; quaternion: Quaternion };
export type ControllerPose = Pose & { intersection: Position | undefined };

export type UserPositionsMessage = {
  event: typeof USER_POSITIONS_EVENT;
  camera: Pose;
  controller1: ControllerPose | undefined;
  controller2: ControllerPose | undefined;
};

function isPose(pose: any): pose is Pose {
  return (
    pose !== null &&
    typeof pose === 'object' &&
    isPosition(pose.position) &&
    isQuaternion(pose.quaternion)
  );
}

function isControllerPose(pose: any): pose is ControllerPose {
  return (
    pose !== null &&
    typeof pose === 'object' &&
    isPosition(pose.position) &&
    isQuaternion(pose.quaternion) &&
    (isPosition(pose.intersection) || pose.intersection === null)
  );
}

export function isUserPositionsMessage(msg: any): msg is UserPositionsMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === USER_POSITIONS_EVENT &&
    isPose(msg.camera) &&
    (!msg.controller1 || isControllerPose(msg.controller1)) &&
    (!msg.controller2 || isControllerPose(msg.controller2))
  );
}
