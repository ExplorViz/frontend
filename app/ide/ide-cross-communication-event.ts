import type { IDEApiCall } from './shared';

export default class IdeCrossCommunicationEvent extends Event {
  data: IDEApiCall | undefined;
}
