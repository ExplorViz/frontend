export default class TimestampService {
  timestamp!: number;

  // TODO not the best solution, should be handled differently
  updateTimestamp(timestamp: number) {
    // this.trigger(TIMESTAMP_UPDATE_EVENT, { originalMessage: { timestamp } });
  }
}
