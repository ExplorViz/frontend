import { IDEApiCall } from './ide-websocket';

export default class IdeCrossCommunicationEvent extends Event {
  data: IDEApiCall | undefined;
}
