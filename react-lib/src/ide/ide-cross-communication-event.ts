import { IDEApiCall } from 'react-lib/src/ide/ide-websocket';

export default class IdeCrossCommunicationEvent extends Event {
  data: IDEApiCall | undefined;
}
