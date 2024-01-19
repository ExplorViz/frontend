import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import { tracked } from '@glimmer/tracking';

export default class IdeWebsocketFacade extends Service.extend(Evented) {
  @tracked
  roomName: string = 'undefined';

  @tracked
  isConnected: boolean = false;

  @tracked
  numConnectedIDEs: number = 0;

  refreshVizData(cl: CommunicationLink[]) {
    this.trigger('ide-refresh-data', cl);
  }

  restartConnection() {
    this.trigger('ide-restart-connection');
  }
}

declare module '@ember/service' {
  interface Registry {
    'ide-websocket-facade': IdeWebsocketFacade;
  }
}
