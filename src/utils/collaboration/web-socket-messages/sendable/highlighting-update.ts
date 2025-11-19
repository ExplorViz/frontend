export const HIGHLIGHTING_UPDATE_EVENT = 'highlighting_update';

export type HighlightingUpdateMessage = {
  event: typeof HIGHLIGHTING_UPDATE_EVENT;
  entityIds: string[];
  areHighlighted: boolean;
};

export function isHighlightingUpdateMessage(
  msg: any
): msg is HighlightingUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === HIGHLIGHTING_UPDATE_EVENT &&
    Array.isArray(msg.entityIds) &&
    Array.isArray(msg.areHighlighted)
  );
}
