import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import HighlightingService from './highlighting-service';
import { TIMESTAMP_UPDATE_EVENT } from 'collaborative-mode/utils/web-socket-messages/sendable/timetsamp-update';

export default class TimestampService extends Service.extend(Evented) {
  @tracked
  timestamp!: number;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

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
