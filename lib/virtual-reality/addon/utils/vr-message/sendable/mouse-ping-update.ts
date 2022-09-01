import { isPosition, Position } from '../util/position';

export const MOUSE_PING_UPDATE_EVENT = 'mouse_ping_update';

export type MousePingUpdateMessage = {
  event: typeof MOUSE_PING_UPDATE_EVENT;
  modelId: string;
  isApplication: boolean;
  position: Position;
};

export function isMousePingUpdateMessage(msg: any): msg is MousePingUpdateMessage {
  return (
    msg !== null
    && typeof msg === 'object'
    && msg.event === MOUSE_PING_UPDATE_EVENT
    && typeof msg.modelId === 'string'
    // && typeof msg.isApplication === 'boolean'
    && isPosition(msg.position)
  );
}
