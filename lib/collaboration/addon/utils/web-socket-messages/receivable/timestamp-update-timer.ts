export const TIMESTAMP_UPDATE_TIMER_EVENT = 'timestamp_update_timer';

export type TimestampUpdateTimerMessage = {
  event: typeof TIMESTAMP_UPDATE_TIMER_EVENT;
  timestamp: number;
};

export function isTimestampUpdateMessage(
  msg: any
): msg is TimestampUpdateTimerMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === TIMESTAMP_UPDATE_TIMER_EVENT &&
    typeof msg.timestamp === 'number'
  );
}
