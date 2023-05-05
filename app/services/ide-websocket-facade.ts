import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';

export default class IdeWebsocketFacade extends Service.extend(Evented) {
  roomName: string = 'undefined';

  refreshVizData(cl: CommunicationLink[]) {
    this.trigger('ide-refresh-data', cl);
  }
}

declare module '@ember/service' {
  interface Registry {
    'ide-websocket-facade': IdeWebsocketFacade;
  }
}
