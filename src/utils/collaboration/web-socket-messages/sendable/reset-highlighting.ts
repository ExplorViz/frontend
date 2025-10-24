export const RESET_HIGHLIGHTING_EVENT = 'all_highlights_reset';

export type ResetHighlightingMessage = {
  event: typeof RESET_HIGHLIGHTING_EVENT;
};

export function isObjectMovedMessage(
  msg: any
): msg is ResetHighlightingMessage {
  return msg !== null && msg.event === RESET_HIGHLIGHTING_EVENT;
}
