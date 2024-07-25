export const CHANGE_LANDSCAPE_EVENT = 'change_landscape';

export type ChangeLandscapeMessage = {
  event: typeof CHANGE_LANDSCAPE_EVENT;
  landscapeToken: string;
};

export function isAppOpenedMessage(msg: any): msg is ChangeLandscapeMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === CHANGE_LANDSCAPE_EVENT &&
    typeof msg.landscapeToken === 'string'
  );
}
