export const JOIN_VR_EVENT = 'join_vr';

export type JoinVrMessage = {
  event: typeof JOIN_VR_EVENT;
};

export function isJoinVrMessage(msg: any): msg is JoinVrMessage {
  return msg !== null && typeof msg === 'object' && msg.event === JOIN_VR_EVENT;
}
