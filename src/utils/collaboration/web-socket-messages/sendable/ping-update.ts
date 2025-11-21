import {
  isPosition,
  Position,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';

export const PING_UPDATE_EVENT = 'ping_update';

export type PingUpdateMessage = {
  event: typeof PING_UPDATE_EVENT;
  modelIds: string[]; // IDs of the models (applications, classes, components) being pinged
  positions: Position[]; // Positions of the mouse pings
};

export function isPingUpdateMessage(msg: any): msg is PingUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === PING_UPDATE_EVENT &&
    Array.isArray(msg.modelIds) &&
    Array.isArray(msg.positions) &&
    msg.positions.every((pos: any) => isPosition(pos))
  );
}
