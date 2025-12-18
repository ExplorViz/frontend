import { CommunicationLink } from 'explorviz-frontend/src/ide/ide-websocket';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { create } from 'zustand';

interface IdeWebsocketFacadeState {
  roomName: string;
  isConnected: boolean;
  numConnectedIDEs: number;
  refreshVizData: (cl: CommunicationLink[]) => void;
  restartConnection: (landscapeToken?: string) => void;
  closeConnection: (landscapeToken?: string) => void;
}

export const useIdeWebsocketFacadeStore = create<IdeWebsocketFacadeState>(
  (set, get) => ({
    roomName: 'undefined', // tracked
    isConnected: false, // tracked
    numConnectedIDEs: 0, // tracked

    refreshVizData: (cl: CommunicationLink[]) => {
      eventEmitter.emit('ide-refresh-data', cl);
    },

    restartConnection: (landscapeToken?: string) => {
      eventEmitter.emit('ide-restart-connection', landscapeToken);
    },

    closeConnection: (landscapeToken?: string) => {
      eventEmitter.emit('ide-close-connection', landscapeToken);
    },
  })
);
