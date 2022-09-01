import { isPosition, Position } from './position';
import { isQuaternion, Quaternion } from './quaternion';
import { ControllerId } from './controller_id';

export type Controller = {
  controllerId: ControllerId;
  assetUrl: string;
  position: Position;
  quaternion: Quaternion;
  intersection: Position | null;
};

export function isController(controller: any): controller is Controller {
  return (
    controller !== null
    && typeof controller === 'object'
    && typeof controller.assetUrl === 'string'
    && isPosition(controller.position)
    && isQuaternion(controller.quaternion)
    && (!controller.intersection || isPosition(controller.intersection))
  );
}
