import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import { tracked } from '@glimmer/tracking';
// import { useIdeWebsocketFacadeStore } from 'react-lib/src/stores/ide-websocket-facade';

export default class IdeWebsocketFacade extends Service.extend(Evented) {
  @tracked
  roomName: string = 'undefined';
  // get roomName(): string {
  //   return useIdeWebsocketFacadeStore.getState().roomName;
  // }
  // set roomName(value: string) {
  //   useIdeWebsocketFacadeStore.setState({ roomName: value });
  // }

  @tracked
  isConnected: boolean = false;
  // get isConnected(): boolean {
  //   return useIdeWebsocketFacadeStore.getState().isConnected;
  // }
  // set isConnected(value: boolean) {
  //   useIdeWebsocketFacadeStore.setState({ isConnected: value });
  // }

  @tracked
  numConnectedIDEs: number = 0;
  // get numConnectedIDEs(): number {
  //   return useIdeWebsocketFacadeStore.getState().numConnectedIDEs;
  // }
  // set numConnectedIDEs(value: number) {
  //   useIdeWebsocketFacadeStore.setState({ numConnectedIDEs: value });
  // }

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
