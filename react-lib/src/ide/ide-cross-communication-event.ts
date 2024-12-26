import { IDEApiCall } from "explorviz-frontend/ide/ide-websocket";

export default class IdeCrossCommunicationEvent extends Event {
  data: IDEApiCall | undefined;
}
