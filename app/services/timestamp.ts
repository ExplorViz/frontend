import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { TIMESTAMP_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';
import { inject as service } from '@ember/service';
import HighlightingService from './highlighting-service';

export default class TimestampService extends Service.extend(Evented) {
  @tracked
  timestamp: (number|undefined)[] = [undefined, undefined]; // TODO: number[] for first and second selected commits

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
