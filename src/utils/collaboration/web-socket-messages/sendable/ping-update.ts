import {
  ControllerId,
  isControllerId,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/controller-id';

export const PING_UPDATE_EVENT = 'ping_update';

export type PingUpdateMessage = {
  event: typeof PING_UPDATE_EVENT;
  controllerId: ControllerId;
  isPinging: boolean;
};

export function isPingUpdateMessage(msg: any): msg is PingUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === PING_UPDATE_EVENT &&
    isControllerId(msg.controllerId) &&
    typeof msg.isPinging === 'boolean'
  );
}
