import { IDEApiCall } from 'explorviz-frontend/src/ide/ide-websocket';

export default class IdeCrossCommunicationEvent extends Event {
  data: IDEApiCall | undefined;
}
