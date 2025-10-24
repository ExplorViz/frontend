import {
  Position,
  isPosition,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';

export const MOUSE_PING_UPDATE_EVENT = 'mouse_ping_update';

export type MousePingUpdateMessage = {
  event: typeof MOUSE_PING_UPDATE_EVENT;
  modelIds: string[]; // IDs of the models (applications, classes, components) being pinged
  positions: Position[]; // Positions of the mouse pings
};

export function isMousePingUpdateMessage(
  msg: any
): msg is MousePingUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === MOUSE_PING_UPDATE_EVENT &&
    Array.isArray(msg.modelIds) &&
    Array.isArray(msg.positions) &&
    msg.positions.every((pos: any) => isPosition(pos))
  );
}
