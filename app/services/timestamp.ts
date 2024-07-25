import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { TIMESTAMP_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/timetsamp-update';

export const NEW_SELECTED_TIMESTAMP_EVENT = 'new_selected_timestamp';

export default class TimestampService extends Service.extend(Evented) {
  @tracked
  timestamp!: number;

  updateSelectedTimestamp(timestamp: number) {
    this.timestamp = timestamp;
    this.trigger(NEW_SELECTED_TIMESTAMP_EVENT, this.timestamp);
  }

  // TODO not the best solution, should be handled differently
  updateTimestampFromVr(timestamp: number) {
    this.trigger(TIMESTAMP_UPDATE_EVENT, { originalMessage: { timestamp } });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    timestamp: TimestampService;
  }
}
