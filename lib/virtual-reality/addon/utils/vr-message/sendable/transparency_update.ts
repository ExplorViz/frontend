export const TRANSPARENCY_UPDATE_EVENT = 'transparency_update';

export type TransparencyUpdateMessage = {
  event: typeof TRANSPARENCY_UPDATE_EVENT;
  appId: string;
  entityIds: string[];
};

export function isTransparencyUpdateMessage(
  msg: any
): msg is TransparencyUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === TRANSPARENCY_UPDATE_EVENT &&
    typeof msg.appId === 'string' &&
    Array.isArray(msg.entityIds) && 
    msg.endityIds.every( (id: any) => typeof id === "string")
  );
}
