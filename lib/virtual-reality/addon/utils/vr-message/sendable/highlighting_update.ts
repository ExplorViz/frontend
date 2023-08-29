export const HIGHLIGHTING_UPDATE_EVENT = 'highlighting_update';

export type HighlightingUpdateMessage = {
  event: typeof HIGHLIGHTING_UPDATE_EVENT;
  isHighlighted: boolean;
  appId: string;
  entityType: string;
  entityId: string;
  isMultiSelected: boolean;
};

export function isHighlightingUpdateMessage(
  msg: any
): msg is HighlightingUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === HIGHLIGHTING_UPDATE_EVENT &&
    typeof msg.appId === 'string' &&
    typeof msg.entityType === 'string' &&
    typeof msg.entityId === 'string'
  );
}
