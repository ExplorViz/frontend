import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { TIMESTAMP_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/timetsamp-update';

export default class TimestampService extends Service.extend(Evented) {
  @tracked
  timestamp: (number | undefined)[] = [undefined, undefined]; // TODO: number[] for first and second selected commits

  // TODO not the best solution, should be handled differently
  updateTimestamp(timestamp: number) {
    this.trigger(TIMESTAMP_UPDATE_EVENT, { originalMessage: { timestamp } });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    timestamp: TimestampService;
  }
}
