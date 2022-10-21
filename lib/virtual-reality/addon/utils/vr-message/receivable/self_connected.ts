import { Color, isColor } from '../util/color';
import { Controller, isController } from '../util/controller';
import { isPosition, Position } from '../util/position';
import { isQuaternion, Quaternion } from '../util/quaternion';

export const SELF_CONNECTED_EVENT = 'self_connected';

type InitialUser = { id: string; name: string; color: Color };

type InitialRemoteUser = InitialUser & {
  position: Position;
  quaternion: Quaternion;
  controllers: Controller[];
};

export type SelfConnectedMessage = {
  event: typeof SELF_CONNECTED_EVENT;
  self: InitialUser;
  users: InitialRemoteUser[];
};

function isInitialUser(user: any): user is InitialUser {
  return (
    user !== null &&
    typeof user === 'object' &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    isColor(user.color)
  );
}

function isInitialRemoteUser(remoteUser: any): remoteUser is InitialRemoteUser {
  return (
    (isInitialUser(remoteUser) as boolean) &&
    isPosition(remoteUser.position) &&
    isQuaternion(remoteUser.quaternion) &&
    Array.isArray(remoteUser.controllers) &&
    remoteUser.controllers.every(isController)
  );
}

export function isSelfConnectedMessage(msg: any): msg is SelfConnectedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === SELF_CONNECTED_EVENT &&
    isInitialUser(msg.self) &&
    Array.isArray(msg.users) &&
    msg.users.every(isInitialRemoteUser)
  );
}
