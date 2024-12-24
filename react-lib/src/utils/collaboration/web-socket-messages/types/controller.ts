import { isPosition, Position } from 'react-lib/src/utils/collaboration/web-socket-messages/types/position';
import { isQuaternion, Quaternion } from 'react-lib/src/utils/collaboration/web-socket-messages/types/quaternion';
import { ControllerId } from 'react-lib/src/utils/collaboration/web-socket-messages/types/controller-id';

export type Controller = {
  controllerId: ControllerId;
  assetUrl: string;
  position: Position;
  quaternion: Quaternion;
  intersection: Position | undefined;
};

export function isController(controller: any): controller is Controller {
  return (
    controller !== null &&
    typeof controller === 'object' &&
    typeof controller.assetUrl === 'string' &&
    isPosition(controller.position) &&
    isQuaternion(controller.quaternion) &&
    (!controller.intersection || isPosition(controller.intersection))
  );
}
