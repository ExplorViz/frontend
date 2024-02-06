export const ALL_HIGHLIGHTS_RESET_EVENT = 'all_highlights_reset';

export type AllHighlightsResetMessage = {
  event: typeof ALL_HIGHLIGHTS_RESET_EVENT;
};

export function isObjectMovedMessage(
  msg: any
): msg is AllHighlightsResetMessage {
  return msg !== null && msg.event === ALL_HIGHLIGHTS_RESET_EVENT;
}
